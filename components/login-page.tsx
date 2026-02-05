"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase"; // adjust path if needed

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login successful → redirect
      router.push("/inventory");
    } catch (err: any) {
      // Friendly Firebase error messages
      if (err.code === "auth/user-not-found") {
        setError("No user found with this email.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect Password.");
      } else {
        setError("Incorect Email or Password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative"
      style={{
        backgroundImage: "url('/maritime-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="mb-4 flex justify-center">
            <Image
              src="/isc-logo.png"
              alt="Interworld Shipping Corporation Logo"
              width={250}   
              height={250}  
              className="h-auto"
              priority
            />
          </div>
          <div className="text-center -mt-2">
            <h1
              className="text-lg font-extrabold text-[#0080C0] mb-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              INTER-WORLD SHIPPING CORPORATION
            </h1>
            <p
              className="text-sm font-light text-[#002060]"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Inventory Management System
            </p>
            <div className="mt-2 h-1 w-16 bg-linear-to-r from-[#60A0C0] to-[#0080C0] mx-auto rounded-full"></div>
          </div>

          {/* Display error message */}
          {error && <p className="text-center text-red-600 text-sm mb-4">{error}</p>}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#002060] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@interworld.com"
                className="w-full px-4 py-2.5 rounded-lg border border-[#D0E0F0] bg-[#F9FBFD] text-[#002060] placeholder-[#80A0C0] focus:outline-none focus:ring-2 focus:ring-[#60A0C0] focus:border-transparent transition-all font-light text-sm"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-[#002060] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D0E0F0] bg-[#F9FBFD] text-[#002060] placeholder-[#80A0C0] focus:outline-none focus:ring-2 focus:ring-[#60A0C0] focus:border-transparent transition-all font-light text-sm pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#80A0C0] hover:text-[#60A0C0] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-[#D0E0F0] accent-[#0080C0]" />
                <span className="text-xs font-light text-[#80A0C0]">Remember me</span>
              </label>
              <a href="#" className="text-xs font-light text-[#0080C0] hover:text-[#60A0C0] transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[#0080C0] hover:bg-[#006BA0] text-white font-semibold rounded-lg transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E0E8F0]">
            <p className="text-center text-xs text-[#80A0C0]">
              Need assistance?{" "}
              <a href="#" className="font-semibold text-[#0080C0] hover:text-[#60A0C0] transition-colors">
                Contact IT Support
              </a>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#80A0C0] font-light">
            This is a secure system. All access is monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
