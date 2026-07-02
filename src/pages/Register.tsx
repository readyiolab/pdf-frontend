import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";
import { UserPlus, Mail, Lock, User, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register, guestSession } = useAuth();
  const navigate = useNavigate();

  const getStrength = (pwd: string) => {
    if (!pwd) return { label: "", width: "0%", color: "" };
    if (pwd.length < 5) return { label: "Weak", width: "33%", color: "bg-destructive" };
    if (pwd.length < 8) return { label: "Fair", width: "66%", color: "bg-amber-500" };
    return { label: "Strong", width: "100%", color: "bg-emerald-500" };
  };

  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    try {
      await register(email, name, password);
      navigate("/workspace");
    } catch (err: any) {
      setError(err.message || "Failed to register.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    try {
      await guestSession();
      navigate("/workspace");
    } catch (err: any) {
      setError("Failed to create guest session.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="rounded-3xl border bg-card/80 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserPlus className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
            <p className="text-sm text-muted-foreground mt-1">Get started with free PDF tools today</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive animate-fade-in">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-9 h-11 bg-background"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-9 h-11 bg-background"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative mb-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="pl-9 h-11 bg-background"
                  disabled={isLoading}
                />
              </div>
              {password && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-300", strength.color)}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground w-10 text-right uppercase">
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl text-base font-bold shadow-md mt-2" disabled={isLoading}>
              {isLoading ? <Spinner className="mr-2" /> : null}
              Create Account
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-semibold">Or continue with</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-11 rounded-xl font-bold bg-muted/50 hover:bg-muted border-none" 
            onClick={handleGuest}
            disabled={isLoading}
          >
            {isLoading ? <Spinner className="mr-2" /> : "Try as Guest First"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
export default Register;
