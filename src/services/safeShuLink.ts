const SAFE_SHU_USER_ID = '5ed52d8f000000000101c793'
const SAFE_SHU_APP_URL = `xhsdiscover://user/${SAFE_SHU_USER_ID}`

export function openSafeShuProfile() {
  window.location.href = SAFE_SHU_APP_URL
}
