import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthForm } from "../components/auth/AuthForm";

export const Register: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <p className="text-lg font-bold tracking-tight">
            PDF<span className="text-primary">Toolkit</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/90 p-6 sm:p-8 shadow-lg shadow-primary/5 backdrop-blur-sm">
          <AuthForm
            mode="register"
            onSwitchMode={(mode) => navigate(mode === "login" ? "/login" : "/register")}
            onSuccess={() => navigate("/verify-email")}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
