# 🚀 راهنمای Deployment برای GitHub Pages

## مشکل صفحه سفید - حل شد! ✅

### تغییرات اعمال شده:

1. **vite.config.ts**
   - اضافه شده: `base: "/star-style-barbershop/"`
   - این تنظیم مسیرهای assets را برای subpath درست می‌کند

2. **.github/workflows/deploy.yml**
   - GitHub Actions workflow برای خودکار deployment
   - هر push به main/master branch، سایت به‌روزرسانی می‌شود

3. **public/404.html**
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
git commit -m "Deploy to GitHub Pages"
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
├── server.cjs          # Backend server (اختیاری)
└── server.cjs.map      # Source map
```

## ✨ تنظیمات نهایی

- ✅ Base path درست شد
- ✅ GitHub Actions workflow آماده است
- ✅ 404 page برای routing مجهز شد
- ✅ Assets paths خودکار تنظیم می‌شود

## 🎯 نتیجه

حالا سایت شما به آدرس زیر در دسترس است:
```
https://mamati1379.github.io/star-style-barbershop/
```

---

اگر مشکل هنوز باقی است، لطفا:
1. Browser developer tools (F12) بازکنید
2. Console tab رو بررسی کنید برای errors
3. Network tab رو بررسی کنید تا ببینید assets load می‌شوند
