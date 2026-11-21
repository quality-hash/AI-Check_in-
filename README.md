# เว็บเช็คชื่อคลาส Claude AI

เว็บลงชื่อเข้าเรียน: ผู้เรียนกดชื่อตัวเอง เซ็นชื่อ ระบบบันทึกเวลาจากเซิร์ฟเวอร์และบอกว่าตรงเวลาหรือสาย
เวอร์ชันปัจจุบันแสดงที่ป้ายข้างหัวเว็บ ดูรายละเอียดใน [CHANGELOG.md](CHANGELOG.md)

เว็บ: https://quality-hash.github.io/AI-Check_in-/

## ระบบหลังบ้าน (Supabase)
- ตาราง: `settings`, `students`, `student_contacts` (อีเมล), `checkins`, `checkin_signatures`, `admins`
- ผู้เรียนไม่ต้องเข้าสู่ระบบ: ดูรายชื่อและลงชื่อได้เฉพาะวันนี้ เวลาใช้เวลาเซิร์ฟเวอร์
- ผู้ดูแล (อีเมลในตาราง `admins`) เข้าสู่ระบบด้วยลิงก์ทางอีเมล แล้วจัดการรายชื่อ ดูลายเซ็น ตั้งค่า และส่งออก CSV ได้
- สิทธิ์ทั้งหมดคุมด้วย Row Level Security คีย์ใน `index.html` เป็นคีย์สาธารณะ (anon) ตามปกติของ Supabase

## ตั้งค่าครั้งเดียวใน Supabase Dashboard
Authentication > URL Configuration
- Site URL: `https://quality-hash.github.io/AI-Check_in-/`
- Redirect URLs: `https://quality-hash.github.io/AI-Check_in-/`

## เพิ่มผู้ดูแล
```sql
insert into public.admins(email) values ('someone@foodlenoodle.com');
```

`Code.gs` (Google Apps Script) เป็นระบบเดิมของ v1.8 ไม่ได้ใช้ใน v2 แล้ว
