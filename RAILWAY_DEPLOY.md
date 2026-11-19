# رفع BarberOps على Railway

## الوضع الحالي

المشروع مجهز ليُبنى من `Dockerfile` على Railway، مع Health Check على `/api/health` وRestart Policy من نوع `ALWAYS`. لا يحتوي هذا الملف على أي مفتاح سري.

التطبيق الآن يستخدم PostgreSQL لحفظ snapshot تشغيل BarberOps، مع جداول تشغيل أساسية تمهيدًا للتطبيع الكامل. وجود PostgreSQL في مشروع Railway وحده لا يجعل التطبيق يستخدمه تلقائياً؛ يجب ربط `DATABASE_URL` بخدمة التطبيق.

## إنشاء المشروع

1. أنشئ Project جديد في Railway.
2. أضف PostgreSQL من `+ New`.
3. أضف خدمة التطبيق من المستودع أو ارفع المشروع عبر GitHub.
4. تأكد أن Railway يقرأ `railway.json` ويستخدم `Dockerfile`.
5. اربط متغير `DATABASE_URL` من خدمة PostgreSQL بخدمة التطبيق.
6. لا تجعل PostgreSQL public؛ التطبيق يتصل به عبر الشبكة الداخلية للمشروع.
7. أضف Domain للتطبيق بعد نجاح أول Deploy.

## Variables / Secrets

أضف هذه القيم في خدمة التطبيق، ولا تضع القيم الحقيقية في Git:

```text
NODE_ENV=production
PERSISTENCE_MODE=postgres
DEMO_MODE=false
OPENROUTER_API_KEY=<Secret>
OPENROUTER_MODEL=<Model name>
BARBEROPS_BASE_URL=<Public app URL>
MESSAGING_PROVIDER_URL=<Messaging provider endpoint>
STAFF_ALERT_WEBHOOK_URL=<Staff alert endpoint>
```

`DATABASE_URL` يأتي من PostgreSQL Railway. لا تنسخ كلمة مرور قاعدة البيانات إلى ملف محلي أو محادثة.

## Deployment settings

يستخدم Railway:

- Builder: Dockerfile.
- Start command: `node dist/index.js`.
- Health check: `/api/health`.
- Health timeout: 120 ثانية.
- Restart policy: `ALWAYS`.
- Graceful drain: 10 ثوانٍ.

يستخدم `railway.json` الأمر `pnpm db:prepare` كـ `preDeployCommand`. هذا الأمر additive فقط، وينشئ الجداول إذا لم تكن موجودة باستخدام `CREATE TABLE IF NOT EXISTS` و`ON CONFLICT DO NOTHING`؛ لا يحذف جداول أو بيانات.

## اختبار بعد الرفع

```bash
curl -fsS https://YOUR_DOMAIN/api/health
curl -fsS https://YOUR_DOMAIN/api/ops/dashboard
```

بعد نجاح migration وربط التخزين الدائم، يجب اختبار إعادة التشغيل ثم التأكد أن الحجوزات ما زالت موجودة. في المرحلة الحالية يتم حفظ حالة التشغيل في جدول `barberops_state` بالإضافة إلى إنشاء الجداول العلائقية الأساسية؛ الخطوة اللاحقة ستنقل الاستعلامات تدريجيًا إلى الجداول العلائقية مباشرة.

## OpenRouter

يضاف المفتاح في Railway كـ Secret باسم `OPENROUTER_API_KEY`. لا يستخدم OpenRouter في منع تعارض الحجوزات أو تغيير حالة الخدمة؛ هذه قواعد برمجية ثابتة. يستخدم لاحقاً لفهم رسائل العملاء واستخراج الخدمة والموعد والحلاق.
