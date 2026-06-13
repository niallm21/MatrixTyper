use aes::Aes256;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use cbc::cipher::block_padding::Pkcs7;
use cbc::cipher::{BlockDecryptMut, KeyIvInit};
use cbc::Decryptor;
use hmac::Hmac;
use pbkdf2::pbkdf2;
use rand::RngCore;
use sha2::Sha256;

const LEGACY_PASSPHRASE: &[u8] = b"MatrixTyperDistractionFreeRetroCyberpunkEditorSecretKey2026";
const LEGACY_SALT: &[u8] = b"MatrixTyperSalt2026";
const LEGACY_ITERATIONS: u32 = 100_000;

const NEW_ITERATIONS: u32 = 600_000;
const KEY_LEN: usize = 32;

const MAGIC_MTX1: &[u8] = b"MTX1";
const MAGIC_MTX2: &[u8] = b"MTX2";

type Aes256CbcDec = Decryptor<Aes256>;

fn get_legacy_key() -> [u8; KEY_LEN] {
    let mut key = [0u8; KEY_LEN];
    let _ = pbkdf2::<Hmac<Sha256>>(LEGACY_PASSPHRASE, LEGACY_SALT, LEGACY_ITERATIONS, &mut key);
    key
}

fn derive_key(password: &str, salt: &[u8]) -> [u8; KEY_LEN] {
    let mut key = [0u8; KEY_LEN];
    let _ = pbkdf2::<Hmac<Sha256>>(password.as_bytes(), salt, NEW_ITERATIONS, &mut key);
    key
}

pub fn encrypt(text: &str, password: &str) -> Result<Vec<u8>, String> {
    let mut salt = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut salt);

    let key_bytes = derive_key(password, &salt);
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, text.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut result = Vec::new();
    result.extend_from_slice(MAGIC_MTX2);
    result.extend_from_slice(&salt);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

pub fn decrypt(buffer: &[u8], password: &str) -> Result<String, String> {
    if buffer.len() < 4 {
        return Err("File is too small to be a MatrixTyper file.".into());
    }

    let (header, rest) = buffer.split_at(4);

    if header == MAGIC_MTX1 {
        // MTX1: 4 byte header + 16 byte IV + ciphertext
        if rest.len() < 16 {
            return Err("Invalid MTX1 file: Missing IV.".into());
        }
        let (iv, ciphertext) = rest.split_at(16);
        let key = get_legacy_key();

        let cipher = Aes256CbcDec::new_from_slices(&key, iv)
            .map_err(|_| "Invalid Key/IV length for MTX1".to_string())?;

        let mut buf = ciphertext.to_vec();
        let decrypted = cipher
            .decrypt_padded_mut::<Pkcs7>(&mut buf)
            .map_err(|_| "MTX1 Decryption failed (bad padding/key).".to_string())?;

        return String::from_utf8(decrypted.to_vec())
            .map_err(|_| "Decrypted text is not valid UTF-8".into());
    }

    if header == MAGIC_MTX2 {
        // MTX2: 4 byte header + 16 byte salt + 12 byte nonce + ciphertext
        if rest.len() < 28 {
            return Err("Invalid MTX2 file: Missing salt or nonce.".into());
        }
        let (salt, rest) = rest.split_at(16);
        let (nonce_bytes, ciphertext) = rest.split_at(12);

        let key_bytes = derive_key(password, salt);
        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(nonce_bytes);

        let decrypted = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| "Incorrect password or tampered file.".to_string())?;

        return String::from_utf8(decrypted)
            .map_err(|_| "Decrypted text is not valid UTF-8".into());
    }

    Err("Unrecognized file signature. Not a MatrixTyper file.".into())
}
