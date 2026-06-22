# 🚀 راهنمای Deployment برای GitHub Pages

## مشکل صفحه سفید - حل شد! ✅

### آخرین تغییرات (Fixed - June 22, 2026):

1. **❌ Deleted: `.github/workflows/static.yml`**
   - این workflow درست کار نمی‌کرد (کل repo رو upload می‌کرد بدون build)
   - جایش رو `deploy.yml` گرفت

2. **✅ src/fonts.css**
   - تغییر: relative paths → absolute paths with base path
   - From: `url("../fonts/IRANSansX-Regular.otf")`
   - To: `url("/star-style-barbershop/fonts/IRANSansX-Regular.otf")`
   - این مطمئن می‌کند فونت‌ها درست load شوند

### اصلی تغییرات:

1. **vite.config.ts**
   - اضافه شده: `base: "/star-style-barbershop/"`
   - این تنظیم مسیرهای assets را برای subpath درست می‌کند

2. **.github/workflows/deploy.yml** (تنها workflow صحیح)
   - GitHub Actions workflow برای خودکار deployment
   - هر push به main/master branch، سایت به‌روزرسانی می‌شود

3. **dist/404.html**
   - فایل 404 سفارشی برای routing صحیح

4. **.nojekyll**
   - این فایل به GitHub Pages می‌گوید از Jekyll استفاده نکند

## 📋 نکات مهم

### Repository Settings (GitHub)
```
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: gh-pages
4. Folder: / (root)
```

### اگر صفحه هنوز سفید است:
1. **Cache کرومی را پاک کنید**: Ctrl+Shift+R (یا Cmd+Shift+R)
2. **GitHub Actions** رو بررسی کنید:
   - Actions tab → Deploy to GitHub Pages
   - Check اینکه workflow successful باشد
3. **Workflow logs** بررسی کنید برای خطاها

## 🔍 بررسی صحیح Deployment

```bash
# 1. محلی test کنید
npm run build
npm run preview

# 2. Deploy خود را push کنید
git add .
git commit -m "Fix: Remove static.yml workflow, fix font paths"
git push origin main

# 3. GitHub Actions منتظر بگیرید (2-3 دقیقه)
# https://github.com/mamati1379/star-style-barbershop/actions

# 4. سایت بررسی کنید
# https://mamati1379.github.io/star-style-barbershop/
```

## 📂 Build Output Structure

```
dist/
├── index.html          # صفحه اصلی
├── assets/
│   ├── index-*.js      # JavaScript bundled
│   └── index-*.css     # CSS bundled
├── fonts/              # تمام فایل‌های فونت کپی شده
│   ├── IRANSansX-Regular.otf
│   ├── IRANSansX-Bold.ttf
│   └── ... (22 فایل دیگر)
├── 404.html            # Custom 404 redirect page
├── server.cjs          # Backend server (اختیاری)
└── server.cjs.map      # Source map
```

## ✨ تنظیمات نهایی

- ✅ Base path درست شد (`/star-style-barbershop/`)
- ✅ GitHub Actions workflow آماده است (فقط `deploy.yml`)
- ✅ 404 page برای routing مجهز شد
- ✅ Assets paths خودکار تنظیم می‌شود
- ✅ Font CSS paths تصحیح شد (absolute paths)
- ✅ Conflicting workflow removed (`static.yml` حذف شد)

## 🎯 نتیجه

حالا سایت شما به آدرس زیر در دسترس است:
```
https://mamati1379.github.io/star-style-barbershop/
```

---

## 🐛 Troubleshooting

اگر صفحه هنوز سفید است:

1. **Hard refresh کنید**: `Cmd+Shift+R` (macOS) یا `Ctrl+Shift+R` (Windows)
   - GitHub Pages caching می‌تواند مشکل ایجاد کند

2. **Browser console بررسی کنید** (F12):
   - Network tab: assets و fonts load می‌شوند؟
   - Console: JavaScript errors?
   - نگاه کن برای: 404 Not Found errors

3. **GitHub Actions بررسی کنید**:
   - https://github.com/mamati1379/star-style-barbershop/actions
   - آخرین workflow "Deploy to GitHub Pages" successful بود؟
   - Logs میں کوئی error نہیں؟

4. **Repository Settings verify کنید**:
   - Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `gh-pages`
   - Folder: `/ (root)`
