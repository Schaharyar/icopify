"use client";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Eye, EyeOff } from "lucide-react";

// Reusable InputField Component
const InputField = ({ label, type, value, onChange, onBlur, error, placeholder, showPasswordToggle }) => {
    return (
        <div className="w-full max-w-sm min-w-[200px] mb-4 relative">
            <input
                className={`peer w-full bg-transparent placeholder-transparent text-slate-700 text-sm border ${
                    error ? "border-red-500" : "border-slate-200"
                } rounded-md px-3 pt-4 pb-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow`}
                type={type}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={placeholder}
                id={label.toLowerCase().replace(" ", "-")}
                autoComplete="new-password"
                required
            />
            <label
                className={`absolute left-3 -top-2 text-slate-400 text-sm transition-all transform origin-left ${
                    value ? "-top-2 text-sm scale-90 px-1 bg-white" : "top-4"
                } peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-red-400 peer-placeholder-shown:bg-white
                peer-placeholder-shown:px-0 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-slate-400 peer-focus:scale-90 peer-focus:bg-white peer-focus:px-1`}
                htmlFor={label.toLowerCase().replace(" ", "-")}
            >
                {label}
            </label>
            {showPasswordToggle && (
                <button
                    type="button"
                    onClick={showPasswordToggle.onClick}
                    className="absolute right-3 top-3 text-gray-500"
                    aria-label={showPasswordToggle.ariaLabel}
                >
                    {showPasswordToggle.icon}
                </button>
            )}
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
};

// Reusable Checkbox Component
const Checkbox = ({ id, label, checked, onChange }) => {
    return (
        <div className="flex items-center mb-4">
            <input type="checkbox" id={id} checked={checked} onChange={onChange} className="mr-2" />
            <label htmlFor={id} className="text-sm text-slate-700">
                {label}
            </label>
        </div>
    );
};

// Reusable Captcha Component
const Captcha = ({ question, answer, onChange, error }) => {
    return (
        <div className="w-full max-w-sm min-w-[200px] mb-4">
            <div className="mb-2">
                <p className="text-sm text-slate-700">Solve the following: {question}</p>
            </div>
            <InputField
                label="Answer"
                type="text"
                value={answer}
                onChange={onChange}
                placeholder="Enter your answer"
                error={error}
            />
        </div>
    );
};

// Main AuthForm Component
const AuthForm = () => {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(false);
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [touched, setTouched] = useState({ name: false, email: false, password: false });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ name: "", email: "", password: "", captcha: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [captchaAnswer, setCaptchaAnswer] = useState("");
    const [captchaQuestion] = useState(generateCaptchaQuestion());

    // Generate a simple CAPTCHA question
    function generateCaptchaQuestion() {
        const num1 = Math.floor(Math.random() * 10);
        const num2 = Math.floor(Math.random() * 10);
        return { question: `${num1} + ${num2}`, answer: num1 + num2 };
    }

    // Validation functions
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePassword = (pass) => /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/.test(pass);
    const validateNameLength = (name) => name.length >= 3 && name.length <= 20;

    // Handle blur event
    const handleBlur = (field) => {
        setTouched({ ...touched, [field]: true });
        validateField(field);
    };

    // Validate a specific field
    const validateField = (field) => {
        let errorMessage = "";
        switch (field) {
            case "name":
                if (!validateNameLength(name)) {
                    errorMessage = "Name must be 3-20 characters long.";
                }
                break;
            case "email":
                if (!validateEmail(identifier)) {
                    errorMessage = "Please enter a valid email address.";
                }
                break;
            case "password":
                if (!validatePassword(password)) {
                    errorMessage = "Password must be at least 6 characters long, include one uppercase letter, and one special character.";
                }
                break;
            default:
                break;
        }
        setErrors({ ...errors, [field]: errorMessage });
    };

    // Check if the form is valid
    const isFormValid = () => {
        if (isLogin) {
            return validateEmail(identifier) && validatePassword(password);
        }
        return (
            validateNameLength(name) &&
            validateEmail(identifier) &&
            validatePassword(password) &&
            acceptTerms &&
            parseInt(captchaAnswer) === captchaQuestion.answer
        );
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        validateField("name");
        validateField("email");
        validateField("password");

        if (!isFormValid()) {
            if (!acceptTerms) {
                toast.error("Please accept the terms and conditions.");
            }
            if (parseInt(captchaAnswer) !== captchaQuestion.answer) {
                toast.error("CAPTCHA answer is incorrect.");
            }
            return;
        }

        setIsLoading(true);
        const endpoint = isLogin ? "/api/auth/local" : "/api/auth/local/register";
        const payload = isLogin ? { identifier, password } : { username: name, email: identifier, password };

        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_STRAPI_URL}${endpoint}`, payload);
            if (isLogin) {
                localStorage.setItem("jwt", res.data.jwt);
                localStorage.setItem("user", JSON.stringify(res.data.user));
                toast.success("Login successful!");
                setTimeout(() => router.push("/dashboard"), 1500);
            } else {
                toast.success("Registration successful!");
                setTimeout(() => setIsLogin(true), 2000);
            }
        } catch (err) {
            if (err.response?.data?.error) {
                const errorMessage = err.response.data.error.message.toLowerCase();
                if (errorMessage.includes("username") || errorMessage.includes("name")) {
                    setErrors({ ...errors, name: "Username is already taken." });
                }
                if (errorMessage.includes("email")) {
                    setErrors({ ...errors, email: "Email is already registered." });
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 w-full overflow-hidden">
            <div className="relative bg-white shadow-lg rounded-lg flex flex-col md:flex-row max-w-4xl w-full overflow-hidden">
                {/* Left Side */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-8 rounded-t-lg md:rounded-l-lg md:rounded-tr-none flex flex-col justify-center items-center w-full md:w-1/3 text-center">
                    <h1 className="text-3xl font-bold mb-4">iCopify</h1>
                    <p className="mb-8">Never Pay Until You're 100% Satisfied - Increasing traffic, leads, and sales.</p>
                    <p className="mb-4">{isLogin ? "Don't have an account?" : "Have an account?"}</p>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="bg-transparent border border-white text-white py-2 px-4 rounded hover:bg-white hover:text-red-500 transition-colors"
                    >
                        {isLogin ? "Sign Up" : "Log In"}
                    </button>
                </div>

                {/* Right Side */}
                <div className="relative p-8 w-full md:w-2/3 flex flex-col justify-center h-full max-w-md mx-auto overflow-hidden">
                    <h2 className="text-3xl font-bold mb-4 text-center">{isLogin ? "Log In" : "Create New Account"}</h2>
                    <form onSubmit={handleSubmit} autoComplete="off">
                        {!isLogin && (
                            <InputField
                                label="Name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={() => handleBlur("name")}
                                error={errors.name}
                            />
                        )}
                        <InputField
                            label={isLogin ? "Username or Email" : "Email"}
                            type="email"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            onBlur={() => handleBlur("email")}
                            error={errors.email}
                        />
                        <InputField
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => handleBlur("password")}
                            error={errors.password}
                            showPasswordToggle={{
                                onClick: () => setShowPassword(!showPassword),
                                icon: showPassword ? <EyeOff /> : <Eye />,
                                ariaLabel: showPassword ? "Hide password" : "Show password",
                            }}
                        />
                        {!isLogin && (
                            <>
                                <Checkbox
                                    id="terms"
                                    label="I agree to the terms and conditions"
                                    checked={acceptTerms}
                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                />
                                <Captcha
                                    question={captchaQuestion.question}
                                    answer={captchaAnswer}
                                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                                    error={errors.captcha}
                                />
                            </>
                        )}
                        <button
                            className="w-full bg-transparent border border-red-500 text-red-500 py-2 px-4 rounded hover:bg-gradient-to-r from-orange-500 to-red-500 hover:text-white transition-colors"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? "Processing..." : isLogin ? "Log In" : "Create Account"}
                        </button>
                    </form>
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
        </div>
    );
};

export default AuthForm;