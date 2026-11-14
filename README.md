# เว็บเช็คชื่อคลาส Claude AI

เว็บลงชื่อเข้าเรียน: ผู้เรียนกดชื่อตัวเอง เซ็นชื่อ ระบบบันทึกเวลาและบอกว่าตรงเวลาหรือสาย
ส่งออก CSV / คัดลอกไป Google Sheets ได้ และเชื่อม Google Sheets เป็นฐานข้อมูลผ่าน Apps Script (`Code.gs`)

เวอร์ชันปัจจุบันแสดงที่ป้ายข้างหัวเว็บ (กดเพื่อดูประวัติ) ดูรายละเอียดใน [CHANGELOG.md](CHANGELOG.md)

## เปิดเว็บด้วย GitHub Pages
Settings > Pages > Source: Deploy from a branch > Branch: `main` / `(root)` > Save
เว็บจะอยู่ที่ https://quality-hash.github.io/AI-Check_in-/

## เชื่อม Google Sheets
1. สร้าง Google Sheet > ส่วนขยาย > Apps Script > วางโค้ดจาก `Code.gs`
2. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone) > คัดลอก URL `/exec`
3. ใส่ใน `CONFIG.googleScriptUrl` ของ `index.html` แล้ว commit

รายละเอียดเพิ่มเติมอยู่ใน `README.txt`
