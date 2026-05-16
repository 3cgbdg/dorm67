# Dorm67 - The Student Life Super-App 🎓🏠

Dorm67 — це сучасна платформа для студентських спільнот, яка перетворює життя в гуртожитку на організований та технологічний досвід. Додаток дозволяє студентам торгувати, обмінюватися новинами та отримувати допомогу від штучного інтелекту.

## 🚀 Технологічний Стек (Tech Stack)

### Frontend
- **Framework:** React 18 з Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn UI
- **State Management:** Zustand
- **Animations:** Lucide React (Icons) + Tailwind Transitions
- **Deployment:** Vercel

### Backend & Infrastructure
- **Runtime:** Node.js (Express.js)
- **Database:** Google Firebase Firestore (Real-time NoSQL)
- **Authentication:** Firebase Auth (Email/Password & Google OAuth)
- **AI Integration:** OpenAI API (GPT Models) + Anthropic Claude (Taras lab reports)
- **Deployment:** Render.com

---

## ✨ Основні Функції (Core Features)

### 🧪 Taras (AI Tools — lab reports)
- **Flow:** Upload template images → analyze style → fill metadata & measurements → async generation → preview (sanitized HTML) → download `.docx`.
- **Storage:** Templates and outputs live in **Firebase Storage** under `aiTaras/…` (not public; downloads go through the API with Firebase Auth).
- **Server env:** set `ANTHROPIC_API_KEY` (and optional `FIREBASE_STORAGE_BUCKET`, `TARAS_ANTHROPIC_MODEL`) in `server/.env`. Deploy Firestore indexes from `firestore.indexes.json` after the first `collectionGroup` query error link, if needed.

### 🤖 AI Assistant (Campus Helper)
- **Real-time Streaming:** Відповіді генеруються слово за словом для кращого UX.
- **Background Persistence:** Навіть якщо користувач закриє вкладку, сервер допише відповідь у базу даних.
- **Context-Aware:** Допомога з питаннями гуртожитку, навчання та побуту.

### 🛒 Marketplace & Feed
- **Campus Marketplace:** Студенти можуть виставляти речі на продаж (одяг, техніка, книги).
- **Social Feed:** Оголошення про події, втрачені речі (Lost & Found) та важливі новини.
- **Image Management:** Локальне завантаження зображень з оптимізацією.

### 💬 Messaging System
- **Real-time Chats:** Миттєвий обмін повідомленнями між продавцями та покупцями.
- **Unread Indicators:** Відстеження непрочитаних повідомлень.

### 👤 Profile & Onboarding
- **University Select:** Прив'язка користувача до конкретного закладу та гуртожитку.
- **Smart Redirects:** Автоматичне розпізнавання нових користувачів для налаштування профілю.

---

## 🏗️ Архітектурні Особливості

### 1. Robust AI Task Queue
Ми реалізували гібридну систему:
- **Client Side:** Використовує SSE (Server-Sent Events) для миттєвого відображення відповіді.
- **Server Side:** Використовує Firebase Admin SDK для атомарного запису історії чату в фоновому режимі.

### 2. Premium UX/UI
- **Design System:** Використано гармонійну палітру "земляних" кольорів (Earth tones) для комфортного читання.
- **Custom Branding:** Власна іконка проекту, інтегрована в таб браузера та інтерфейс.
- **Error Handling:** Централізована система `handleAppError`, яка замінює технічні помилки Firebase на зрозумілі користувачу Toast-повідомлення.

---

## 🛠️ Налаштування та Деплой

### Змінні оточення (.env)
**Client:**
- `VITE_FIREBASE_API_KEY`
- `VITE_API_URL` (URL бекенду)

**Server:**
- `FIREBASE_PRIVATE_KEY` (Service Account)
- `OPENAI_API_KEY`
- `CLIENT_ORIGIN` (URL фронтенду)

### Деплой
1. **Frontend**: Vercel (Root: `/client`)
2. **Backend**: Render.com (Root: `/server`)
3. **Database**: Створити проект у Firebase Console та налаштувати Firestore Rules.

---

## 📈 Плани на майбутнє (Roadmap)
- [ ] Підключення Cloudinary для хмарного зберігання фото.
- [ ] Система рейтингів та відгуків про продавців.
- [ ] Push-сповіщення у браузері.
- [ ] Інтеграція з розкладом занять університету.

---
Created with ❤️ for students of Dorm 67.
