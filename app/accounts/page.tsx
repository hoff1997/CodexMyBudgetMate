"use client";
import { useState } from "react";

export default function AccountsPage() {
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    // TODO: Replace with Supabase mutation
    setMessage(`Account '${accountName}' of type '${accountType}' created! (Simulated)`);
    setAccountName("");
    setAccountType("");
  }

  return (
    <div className="max-w-lg mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Add Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Account Name"
          value={accountName}
          onChange={e => setAccountName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="Account Type (e.g. Checking, Savings)"
          value={accountType}
          onChange={e => setAccountType(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded">Add Account</button>
      </form>
      {message && <p className="mt-4 text-green-600">{message}</p>}
    </div>
  );
}
