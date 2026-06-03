import { useState } from "react";
import axios from "axios";

// ВИПРАВЛЕНО: Назва пропсу тепер onLogin, як очікує App.jsx
function LoginForm({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (isLogin) {
      try {
        const res = await axios.post("http://localhost:5001/api/auth/login", {
          email,
          password,
        });
        // ВИПРАВЛЕНО: Викликаємо правильну функцію
        onLogin(res.data.token, res.data.user);
      } catch (err) {
        setError(err.response?.data?.error || "Неправильна пошта або пароль.");
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        await axios.post("http://localhost:5001/api/auth/register", {
          username,
          email,
          password,
          role: "client",
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
        });
        setSuccess("Профіль успішно створено. Тепер ви можете увійти.");
        setIsLogin(true);
      } catch (err) {
        setError(
          err.response?.data?.error ||
            "Помилка створення профілю. Перевірте дані."
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-main bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#0d1a14] to-[#0a0f0d] p-4">
      <div className="w-full max-w-md bg-bg-card border border-border-color p-8 shadow-[0_0_50px_rgba(0,229,160,0.03)] animate-sys-fade">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-wider text-accent-primary drop-shadow-[0_0_12px_rgba(0,229,160,0.4)] font-mono">
            FOODSKY
          </h1>
          <p className="text-[10px] text-text-muted uppercase tracking-widest mt-2 font-medium">
            Автоматизована доставка їжі дронами
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[#1a0f11] border border-danger text-danger text-xs font-mono font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-3 bg-[#0f1a14] border border-accent-primary text-accent-primary text-xs font-mono font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
                    Ім'я
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Олена"
                    className="w-full bg-transparent border border-border-color focus:border-accent-primary focus:outline-none text-text-main text-sm px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
                    Прізвище
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Коренюк"
                    className="w-full bg-transparent border border-border-color focus:border-accent-primary focus:outline-none text-text-main text-sm px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
                  Нікнейм замовника
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="olena_sky"
                  className="w-full bg-transparent border border-border-color focus:border-accent-primary focus:outline-none text-text-main text-sm px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
                  Номер телефону
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+380991234567"
                  className="w-full bg-transparent border border-border-color focus:border-accent-primary focus:outline-none text-text-main text-sm px-3 py-2 font-mono"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
              Електронна пошта
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@foodsky.com"
              className="w-full bg-transparent border border-border-color focus:border-accent-primary focus:outline-none text-text-main text-sm px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
              Пароль
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent border border-border-color focus:border-accent-primary focus:outline-none text-text-main text-sm px-3 py-2 font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent-primary hover:bg-accent-primary/90 text-bg-main font-mono text-xs font-bold uppercase tracking-widest py-3 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,229,160,0.35)] cursor-pointer disabled:opacity-50"
            >
              {isLoading
                ? "Обробка..."
                : isLogin
                ? "Увійти"
                : "Зареєструватися"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-border-color/30 pt-4">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }}
            className="text-xs text-accent-secondary hover:underline cursor-pointer font-medium tracking-wide bg-transparent border-none"
          >
            {isLogin
              ? "Створити новий акаунт клієнта"
              : "Вже є профіль? Авторизуватися"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
