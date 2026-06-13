"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login03() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Network error");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-dvh bg-white">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h3 className="text-balance text-center text-lg font-semibold text-foreground">
            Welcome Back
          </h3>
          <p className="text-pretty text-center text-sm text-muted-foreground">
            Enter your credentials to access your account.
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@intellilabs.com"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="**************"
                className="mt-2"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="mt-4 w-full py-2 font-medium">
              Sign in
            </Button>
          </form>
          <p className="text-pretty mt-6 text-center text-xs text-muted-foreground">
            IntelliLabs Mail Platform
          </p>
        </div>
      </div>
    </div>
  );
}
