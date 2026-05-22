const SAFE_SHU_USER_ID = '5ed52d8f000000000101c793'
const SAFE_SHU_WEB_URL = `https://www.xiaohongshu.com/user/profile/${SAFE_SHU_USER_ID}`
const SAFE_SHU_APP_URLS = [
  `xhsdiscover://user/${SAFE_SHU_USER_ID}`,
  `xhsdiscover://user/profile/${SAFE_SHU_USER_ID}`,
  SAFE_SHU_WEB_URL
]

export function openSafeShuProfile() {
  let hop = 0
  const start = Date.now()

  const jump = () => {
    if (hop >= SAFE_SHU_APP_URLS.length) {
      window.location.href = SAFE_SHU_WEB_URL
      return
    }
    window.location.href = SAFE_SHU_APP_URLS[hop]
    hop += 1
  }

  jump()
  const retryTimer = window.setInterval(() => {
    if (Date.now() - start > 1800) {
      window.clearInterval(retryTimer)
      return
    }
    jump()
  }, 420)

  window.setTimeout(() => {
    window.clearInterval(retryTimer)
  }, 2000)
}
