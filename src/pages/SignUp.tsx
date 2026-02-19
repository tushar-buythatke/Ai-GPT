import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const SignUp = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok || data.status === 0) {
        setError(data.message || "Registration failed. Please try again.");
        return;
      }
      login(data.token, data.user);
      navigate("/", { replace: true });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0 dark:opacity-30 opacity-10">
        <div
          className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full blur-[120px]"
          style={{ background: "hsl(var(--primary) / 0.5)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Hatke Robot</h1>
          <p className="text-sm text-muted-foreground mt-2">Create your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-sm"
        >
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[13px] text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@buyhatke.com"
              autoComplete="email"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring/50 transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[13px] text-muted-foreground">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label className="text-[13px] text-muted-foreground">Confirm password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring/50 transition-all"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[13px] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium transition-all",
              loading
                ? "bg-primary/50 text-primary-foreground/70 cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
            )}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>Create account <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-center text-[13px] text-muted-foreground mt-5">
          Already have an account?{" "}
          <Link to="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
