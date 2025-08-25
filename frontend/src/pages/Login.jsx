import { useState, useEffect,useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useUser } from "../context/UserContext";
import { useWebSocket } from "../context/WebSocketContext";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [oauth2Loading, setOauth2Loading] = useState(false);
  const oauth2ProcessedRef = useRef(false);
  const { login } = useUser();
  const { connect } = useWebSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleOAuth2Callback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
  // Nếu đã xử lý rồi thì return
  if (oauth2ProcessedRef.current) {
    return;
  }
      if (errorParam) {
        
        oauth2ProcessedRef.current = true;
        setError(decodeURIComponent(errorParam));
        setOauth2Loading(false);
        return;
      }
      if (code) {
        oauth2ProcessedRef.current = true;
        try {
          setOauth2Loading(true);
          console.log("Processing OAuth2 callback with code");

          if (code) {
            const userResponse = await axios.post(
              "http://localhost:8081/api/auth/oauth2/login",
              {
                code,
              }
            );

            const { user, userMetric, token } = userResponse.data;

            login({ user, userMetric,  token });
            console.log("OAuth2 login successful:", user);

            // Kết nối WebSocket
            console.log(
              `${user.role} logged in via OAuth2, connecting WebSocket...`
            );
            connect(token, user);

            // Navigation based on role
            if (user.role === "USER") {
              navigate("/");
            } else if (user.role === "AGENT") {
              navigate("/agent");
            } else if (user.role === "ADMIN") {
              navigate("/admin");
            }
          } else {
            setError("Xác thực OAuth2 thất bại. Vui lòng thử lại.");
          }
        } catch (error) {
          console.error("OAuth2 callback error:", error);
          setError(
            error.response?.data?.message ||
              "Đăng nhập OAuth2 thất bại. Vui lòng thử lại."
          );
        } finally {
          setOauth2Loading(false);
        }
      }
    };

    handleOAuth2Callback();
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:8081/api/auth/login",
        {
          email,
          password,
        }
      );

      console.log("Login response:", response.data);

      // Lấy thông tin user, agent và token từ response
      const { user, userMetric, token } = response.data;

      // Lưu toàn bộ data vào context
      login({ user, userMetric, token });
      console.log("Token:", token);

      // Kết nối WebSocket cho tất cả users (để nhận support requests và notifications)
      console.log(`${user.role} logged in, connecting WebSocket...`);
      connect(token, user);

      // Navigation based on role
      if (user.role === "USER") {
        navigate("/");
      } else if (user.role === "AGENT") {
        navigate("/agent");
      } else if (user.role === "ADMIN") {
        navigate("/admin");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setIsLoading(false);
    }
  };
  const handleGoogleLogin = () => {
    setError("");
    setOauth2Loading(true);
    oauth2ProcessedRef.current = false;
    // Redirect đến Google OAuth2 endpoint
    window.location.href = "http://localhost:8081/oauth2/authorization/google";
  };

  // Hiển thị loading khi đang xử lý OAuth2
  if (oauth2Loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            Đang xử lý đăng nhập Google...
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Vui lòng chờ trong giây lát
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 hover:scale-105">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Đăng nhập
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 animate-shake">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Nhập email của bạn"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 disabled:bg-gray-50 disabled:opacity-70"
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Nhập mật khẩu"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 disabled:bg-gray-50 disabled:opacity-70"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Đang đăng nhập...
              </div>
            ) : (
              "Đăng nhập"
            )}
          </button>
          
        </form>
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">hoặc</span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-md"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập với Google"}
            </span>
          </button>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{" "}
              <a
                href="/register"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
              >
                Đăng ký ngay
              </a>
            </p>
          </div>
      </div>
    </div>
  );
};
