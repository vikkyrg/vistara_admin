import React, { useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();

  const handleResetPassword = async () => {
    if (!email) {
      setMessage("Please enter your email.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Reset email sent! Check your inbox.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 text-white">
        <h2 className="text-2xl font-bold mb-4 text-center">Reset Password</h2>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 mb-4"
        />

        {message && (
          <p className="text-sm text-center mb-4 text-yellow-400">{message}</p>
        )}

        <button
          onClick={handleResetPassword}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg"
        >
          Send Reset Link
        </button>

        <p
          onClick={() => navigate("/login")}
          className="text-sm text-gray-400 text-center mt-4 cursor-pointer hover:underline"
        >
          Back to Login
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
