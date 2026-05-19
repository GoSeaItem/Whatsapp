# Chrome Extension 鐧诲綍鎬侀獙鏀舵楠?
鐩爣锛氱‘璁?WhatsApp Web 渚ц竟鏍忓彲浠ュ湪鐪熷疄 Chrome 鐜涓鐢?Web 鍚庡彴鐧诲綍鎬侊紝骞惰兘绋冲畾璁块棶鍙椾繚鎶?API銆?
## 1. 鍚姩鏁版嵁搴撳拰鍚庣

```powershell
Set-Location "E:\Codex\2026-05-18\0-v1-whatsapp-ai-v1-whatsapp"
Copy-Item .env.example .env -Force
npm.cmd install
docker compose up -d postgres
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name v1_internal_auth_persistence
npm.cmd run db:seed
npm.cmd run dev:api
```

淇濇寔鍚庣绐楀彛杩愯銆?
## 2. 鍚姩 Web 鍚庡彴

鍙﹀紑涓€涓?PowerShell 绐楀彛锛?
```powershell
Set-Location "E:\Codex\2026-05-18\0-v1-whatsapp-ai-v1-whatsapp"
npm.cmd run dev:web
```

鎵撳紑锛?
```text
http://localhost:5173
```

浣跨敤榛樿璐﹀彿鐧诲綍锛?
```text
<admin-email>
<admin-password>
```

## 3. 鏋勫缓骞跺姞杞?Chrome Extension

```powershell
Set-Location "E:\Codex\2026-05-18\0-v1-whatsapp-ai-v1-whatsapp"
npm.cmd run build -w @wa-ai/extension
```

Chrome 涓墦寮€锛?
```text
chrome://extensions
```

鎵ц锛?
```text
寮€鍚?Developer mode
鐐瑰嚮 Load unpacked
閫夋嫨 E:\Codex\2026-05-18\0-v1-whatsapp-ai-v1-whatsapp\apps\extension\dist
```

璁板綍鎻掍欢 ID锛屼緥濡傦細

```text
abcdefghijklmnopabcdefghijklmnop
```

## 4. 閰嶇疆 Chrome extension origin

鍋滄鍚庣锛岀劧鍚庣紪杈?`.env`锛?
```env
WEB_ORIGIN="http://localhost:5173"
CHROME_EXTENSION_ORIGIN="chrome-extension://abcdefghijklmnopabcdefghijklmnop"
SESSION_COOKIE_SAMESITE="None"
SESSION_COOKIE_SECURE="true"
```

閲嶆柊鍚姩鍚庣锛?
```powershell
Set-Location "E:\Codex\2026-05-18\0-v1-whatsapp-ai-v1-whatsapp"
npm.cmd run dev:api
```

璇存槑锛?
- Web 鍚庡彴 origin 浣跨敤 `WEB_ORIGIN`銆?- Chrome 鎻掍欢 origin 浣跨敤 `CHROME_EXTENSION_ORIGIN`銆?- 鎻掍欢浠?`chrome-extension://...` 璇锋眰 `http://localhost:4000`锛屽睘浜庤法绔欒姹傦紱浣跨敤 `SameSite=None` 鏃舵祻瑙堝櫒瑕佹眰 cookie 甯?`Secure`銆?- 寮€鍙戞湡濡傛灉鍙獙璇?Web 鍚庡彴锛屼笉楠岃瘉鎻掍欢 cookie锛屽彲涓存椂浣跨敤 `SESSION_COOKIE_SAMESITE="Lax"` 鍜?`SESSION_COOKIE_SECURE="false"`銆?
## 5. 楠岃瘉鎻掍欢鏈櫥褰曠姸鎬?
鍏堝湪 Web 鍚庡彴閫€鍑虹櫥褰曪紝鎴栨竻鐞嗗綋鍓嶇珯鐐?cookie銆?
鎵撳紑锛?
```text
https://web.whatsapp.com
```

棰勬湡锛?
```text
渚ц竟鏍忔樉绀猴細璇峰厛鐧诲綍 Web 鍚庡彴
鏄剧ず鎸夐挳锛氭墦寮€ Web 鍚庡彴鐧诲綍
浜у搧銆佹姤浠枫€佷繚瀛樺鎴风瓑鍙椾繚鎶ゆ搷浣滀笉鍙敤
```

## 6. 楠岃瘉鎻掍欢宸茬櫥褰曠姸鎬?
鐐瑰嚮渚ц竟鏍忕殑锛?
```text
鎵撳紑 Web 鍚庡彴鐧诲綍
```

鍦?Web 鍚庡彴鐧诲綍锛?
```text
<admin-email>
<admin-password>
```

鍥炲埌 `https://web.whatsapp.com`锛屽埛鏂伴〉闈€?
棰勬湡锛?
```text
渚ц竟鏍忔樉绀猴細宸茬櫥褰曪細Admin
鏄剧ず閭锛歞emo@example.com
浜у搧璧勬枡搴撳彲浠ュ姞杞?鐢熸垚鎶ヤ环鎺ュ彛鍙互璋冪敤
淇濆瓨瀹㈡埛鎺ュ彛鍙互璋冪敤
```

## 7. DevTools 楠岃瘉 CORS 鍜?Cookie

鍦?`https://web.whatsapp.com` 椤甸潰鎵撳紑 DevTools锛屽垏鍒?Network锛岃繃婊わ細

```text
auth/me
products
quotes
customers
```

棰勬湡锛?
```text
GET http://localhost:4000/api/auth/me 杩斿洖 200
璇锋眰甯?Cookie: wa_ai_session=...
鍝嶅簲鍖呭惈 Access-Control-Allow-Origin: chrome-extension://浣犵殑鎻掍欢ID
鍝嶅簲鍖呭惈 Access-Control-Allow-Credentials: true
```

鏈櫥褰曟椂棰勬湡锛?
```text
GET http://localhost:4000/api/auth/me 杩斿洖 401
渚ц竟鏍忔彁绀猴細璇峰厛鐧诲綍 Web 鍚庡彴
```

## 8. curl 杈呭姪楠岃瘉鍚庣鐧诲綍鎬?
杩欎簺鍛戒护涓嶉獙璇?Chrome 鎻掍欢 UI锛屼絾鍙互纭鍚庣 cookie 浼氳瘽鍙敤锛?
```powershell
curl.exe -i http://localhost:4000/api/customers
curl.exe -i -c .\tmp-auth-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"<admin-email>\",\"password\":\"<admin-password>\"}" http://localhost:4000/api/auth/login
curl.exe -i -b .\tmp-auth-cookies.txt http://localhost:4000/api/auth/me
curl.exe -i -b .\tmp-auth-cookies.txt http://localhost:4000/api/customers
Remove-Item .\tmp-auth-cookies.txt -ErrorAction SilentlyContinue
```

## 甯歌澶辫触鎺掓煡

### CORS 鎶ラ敊

妫€鏌?`.env`锛?
```powershell
Get-Content .env
```

纭锛?
```env
WEB_ORIGIN="http://localhost:5173"
CHROME_EXTENSION_ORIGIN="chrome-extension://浣犵殑鎻掍欢ID"
```

淇敼鍚庡繀椤婚噸鍚悗绔細

```powershell
npm.cmd run dev:api
```

### `/api/auth/me` 杩斿洖 401

鍏堢‘璁?Web 鍚庡彴宸茬粡鐧诲綍锛屽啀鍒锋柊 WhatsApp Web 椤甸潰銆?
```powershell
curl.exe -i http://localhost:4000/health
```

濡傛灉鍚庣姝ｅ父浣嗘彃浠朵粛 401锛屽湪 Chrome DevTools 鐨?Application 闈㈡澘妫€鏌?`http://localhost:4000` 鏄惁鏈?`wa_ai_session` cookie銆?
### Cookie 娌℃湁鍐欏叆鎴栨病鏈夊彂閫?
妫€鏌?`.env`锛?
```env
SESSION_COOKIE_SAMESITE="None"
SESSION_COOKIE_SECURE="true"
```

鐒跺悗閲嶅惎鍚庣锛岄噸鏂扮櫥褰?Web 鍚庡彴銆?
濡傛灉褰撳墠 Chrome/鏈満鐜鎷掔粷 `http://localhost` 涓婄殑 Secure cookie锛屽厛鐢?Web 鍚庡彴瀹屾垚甯歌楠屾敹锛涙彃浠惰法绔?cookie 楠屾敹鍙敼鐢ㄦ湰鍦?HTTPS 鍙嶅悜浠ｇ悊鍚庡啀娴嬨€?
### 浜у搧鍒楄〃鍔犺浇澶辫触

纭 seed 宸叉墽琛岋細

```powershell
npm.cmd run db:seed
curl.exe -i -c .\tmp-auth-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"<admin-email>\",\"password\":\"<admin-password>\"}" http://localhost:4000/api/auth/login
curl.exe -i -b .\tmp-auth-cookies.txt http://localhost:4000/api/products
Remove-Item .\tmp-auth-cookies.txt -ErrorAction SilentlyContinue
```

