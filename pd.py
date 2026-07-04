import requests

# الرابط الأساسي بدون البيانات
url = "https://prod-cashi-services.alsoug.com/cashi_terminal/api/v2/mycashi/download-transactions-statement"

# التوكن والبيانات المشفّرة التي استخرجتها
data_param = "ukMqOVQPgFurnRKVIxWSZjlqGfLMKHFV2QmHkUAW9Hwj4QwJIj2bYeg2IQNMS07EKSI2kqs7XAjp558OzuJ4ZSRQqPPTMjPkBaiZ9XRQyFh8JX1CFap0CpsgAzM9PgWjqNC_UmEo4fNQmM_rgBFSvx3pkAzZIyDAMi6BRTv8tcxL0txZ-p7AN_BN"

payload = {'data': data_param}

# إضافة User-Agent لكي يظن السيرفر أن الطلب قادم من متصفح طبيعي وليس بوت
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

print("جاري محاولة تحميل كشف الحساب...")
response = requests.get(url, params=payload, headers=headers)

if response.status_code == 200:
    with open("statement234.pdf", "wb") as file:
        file.write(response.content)
    print("مبروك! تم تحميل ملف الـ PDF بنجاح وحفظه باسم statement.pdf")
else:
    print(f"فشل التحميل. السيرفر رد بكود: {response.status_code}")
    print("قد يكون التوكن قد انتهت صلاحيته ويحتاج لتجديد من التطبيق.")