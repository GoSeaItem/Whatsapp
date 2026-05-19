# 鏈湴鏁版嵁搴撻獙鏀舵楠?
浠ヤ笅鍛戒护鎸?Windows PowerShell 缂栧啓锛屽彲浠ョ洿鎺ュ鍒舵墽琛屻€傝鍏堢‘璁?Docker Desktop 宸插惎鍔紝Node.js 鐗堟湰涓?20 鎴栦互涓娿€?
## 1. 杩涘叆椤圭洰鐩綍

```powershell
Set-Location "E:\Codex\2026-05-18\0-v1-whatsapp-ai-v1-whatsapp"
```

## 2. 鍑嗗鐜鍙橀噺鍜屼緷璧?
```powershell
Copy-Item .env.example .env -Force
npm.cmd install
```

## 3. 鍚姩 PostgreSQL Docker

```powershell
docker compose up -d postgres
docker compose ps
docker compose exec postgres pg_isready -U postgres -d whatsapp_ai_sales_v1
```

棰勬湡鐪嬪埌 `accepting connections`銆?
## 4. 鎵ц Prisma migration

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name v1_internal_auth_persistence
```

濡傛灉鏄叏鏂版暟鎹簱锛屼篃鍙互鐩存帴鎵ц锛?
```powershell
npm.cmd run db:init
```

`db:init` 浼氫緷娆℃墽琛岋細鍚姩 PostgreSQL Docker銆佺敓鎴?Prisma Client銆佹墽琛?migration銆佸啓鍏?seed 鏁版嵁銆?
## 5. 鎵ц seed

濡傛灉绗?4 姝ュ凡缁忔墽琛岃繃 `npm.cmd run db:init`锛屽彲浠ヨ烦杩囨湰姝ラ銆傚惁鍒欐墽琛岋細

```powershell
npm.cmd run db:seed
```

榛樿浼氬垱寤哄唴娴嬫紨绀鸿处鍙凤細

```text
<admin-email>
<admin-password>
```

## 6. 鍚姩鍚庣鏈嶅姟

鎵撳紑涓€涓柊鐨?PowerShell 绐楀彛锛屾墽琛岋細

```powershell
Set-Location "E:\Codex\2026-05-18\0-v1-whatsapp-ai-v1-whatsapp"
npm.cmd run dev:api
```

淇濇寔璇ョ獥鍙ｈ繍琛屻€傚悗缁帴鍙ｉ獙鏀跺湪鍙︿竴涓?PowerShell 绐楀彛鎵ц銆?
## 7. 鍋ュ悍妫€鏌?
```powershell
curl.exe -i http://localhost:4000/health
```

棰勬湡杩斿洖 `HTTP/1.1 200 OK`锛屽搷搴斾綋鍖呭惈锛?
```json
{"ok":true}
```

## 8. 鏈櫥褰曡闂彈淇濇姢 API锛屽簲琚嫆缁?
```powershell
curl.exe -i http://localhost:4000/api/customers
```

棰勬湡杩斿洖锛?
```text
HTTP/1.1 401 Unauthorized
```

鍝嶅簲浣撶被浼硷細

```json
{"message":"Authentication required"}
```

## 9. 璋冪敤鐧诲綍鎺ュ彛

```powershell
curl.exe -i -c .\tmp-auth-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"<admin-email>\",\"password\":\"<admin-password>\"}" http://localhost:4000/api/auth/login
```

棰勬湡杩斿洖锛?
```text
HTTP/1.1 200 OK
```

鍝嶅簲浣撳寘鍚綋鍓嶇敤鎴凤細

```json
{"user":{"email":"<admin-email>","name":"Admin"}}
```

鍚屾椂褰撳墠鐩綍浼氱敓鎴?`tmp-auth-cookies.txt`锛岀敤浜庡悗缁甫鐧诲綍鎬佽姹傘€?
## 10. 璋冪敤褰撳墠鐢ㄦ埛鎺ュ彛

```powershell
curl.exe -i -b .\tmp-auth-cookies.txt http://localhost:4000/api/auth/me
```

棰勬湡杩斿洖锛?
```text
HTTP/1.1 200 OK
```

鍝嶅簲浣撳寘鍚細

```json
{"user":{"email":"<admin-email>"}}
```

## 11. 鐧诲綍鍚庤闂彈淇濇姢 API锛屽簲鍙闂?
```powershell
curl.exe -i -b .\tmp-auth-cookies.txt http://localhost:4000/api/customers
```

棰勬湡杩斿洖锛?
```text
HTTP/1.1 200 OK
```

鍝嶅簲浣撳簲璇ユ槸褰撳墠鐢ㄦ埛鍙鐨勫鎴锋暟缁勶紝渚嬪鍖呭惈 seed 瀹㈡埛 `Mexico Buyer`銆?
## 12. 鍒涘缓涓€鏉″綋鍓嶇敤鎴峰鎴锋暟鎹?
```powershell
curl.exe -i -b .\tmp-auth-cookies.txt -H "Content-Type: application/json" -d "{\"name\":\"Acceptance Test Buyer\",\"whatsappNumber\":\"+52 55 1234 5678\",\"country\":\"Mexico\",\"language\":\"English\",\"notes\":\"Created by local DB acceptance test\"}" http://localhost:4000/api/customers
```

棰勬湡杩斿洖锛?
```text
HTTP/1.1 201 Created
```

鍝嶅簲浣撳寘鍚細

```json
{"name":"Acceptance Test Buyer"}
```

## 13. 鐧诲嚭骞跺啀娆￠獙璇佸彈淇濇姢 API 琚嫆缁?
```powershell
curl.exe -i -b .\tmp-auth-cookies.txt -c .\tmp-auth-cookies.txt -X POST http://localhost:4000/api/auth/logout
curl.exe -i -b .\tmp-auth-cookies.txt http://localhost:4000/api/customers
```

棰勬湡绗簩鏉″懡浠よ繑鍥烇細

```text
HTTP/1.1 401 Unauthorized
```

## 14. 娓呯悊鏈湴楠屾敹 cookie 鏂囦欢

```powershell
Remove-Item .\tmp-auth-cookies.txt -ErrorAction SilentlyContinue
```

## 甯歌澶辫触鎺掓煡

### Docker 鏈惎鍔ㄦ垨绔彛琚崰鐢?
```powershell
docker version
docker compose ps
docker compose logs postgres
netstat -ano | findstr ":5432"
```

濡傛灉鐪嬪埌绫讳技涓嬮潰鐨勯敊璇紝璇存槑 Docker Desktop 娌℃湁鍚姩锛岃鍏堝惎鍔?Docker Desktop 鍐嶉噸璇曠 3 姝ワ細

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

濡傛灉 `5432` 琚崰鐢紝鍙互鍏堝仠姝㈠崰鐢ㄧ鍙ｇ殑鏈湴 PostgreSQL锛屾垨淇敼 `docker-compose.yml` 鐨勭鍙ｆ槧灏勩€?
### 鏁版嵁搴撹繛鎺ュけ璐?
```powershell
Get-Content .env
docker compose exec postgres pg_isready -U postgres -d whatsapp_ai_sales_v1
npm.cmd run prisma:generate
```

纭 `.env` 涓細

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_ai_sales_v1?schema=public"
```

### Migration 澶辫触鎴栨暟鎹簱缁撴瀯涓嶄竴鑷?
```powershell
npx.cmd prisma validate
npx.cmd prisma migrate status
npx.cmd prisma migrate dev --name v1_internal_auth_persistence
```

濡傛灉鍙槸鏈湴寮€鍙戝簱鍙互閲嶅缓锛屽厛纭娌℃湁闇€瑕佷繚鐣欑殑鏁版嵁锛屽啀鎵ц锛?
```powershell
npx.cmd prisma migrate reset
npm.cmd run db:seed
```

### 鐧诲綍澶辫触

```powershell
npm.cmd run db:seed
curl.exe -i -c .\tmp-auth-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"<admin-email>\",\"password\":\"<admin-password>\"}" http://localhost:4000/api/auth/login
```

濡傛灉浠嶅け璐ワ紝妫€鏌ュ悗绔棩蹇楃獥鍙ｆ槸鍚︽湁 Prisma 鎴栨暟鎹簱杩炴帴閿欒銆?
### PowerShell 涓?npm 鎴?curl 琛屼负寮傚父

浣跨敤 `npm.cmd` 鍜?`curl.exe`锛屼笉瑕佷娇鐢?`npm` 鎴?`curl`锛?
```powershell
npm.cmd run dev:api
curl.exe -i http://localhost:4000/health
```

### 鍚庣绔彛琚崰鐢?
```powershell
netstat -ano | findstr ":4000"
```

濡傛灉宸叉湁鏃ф湇鍔″崰鐢?4000锛屽彲浠ュ叧闂棫杩涚▼锛屾垨涓存椂淇敼 `.env`锛?
```env
PORT=4001
```

鐒跺悗鐢ㄦ柊绔彛閲嶆柊娴嬭瘯锛?
```powershell
curl.exe -i http://localhost:4001/health
```

