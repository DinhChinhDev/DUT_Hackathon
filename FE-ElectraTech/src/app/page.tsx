"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "@/styles/login.css";
import Image from "next/image";
import { getDatabase, ref, child, get } from "firebase/database";
import { auth } from "@/app/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import Cookies from "js-cookie";

export default function Login() {
  const [user] = useAuthState(auth);
  const database = getDatabase();
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      const userAccountRef = ref(database, `UserAccount/${username}/password`);
      const passwordSnapshot = await get(userAccountRef);
      if (passwordSnapshot.exists()) {
        const storedPassword = passwordSnapshot.val();

        if (password == storedPassword) {
          Cookies.set("username", username);
          router.push("/dashboard");
          return;
        }
      } else {
        alert("Password or Username is incorrect");
      }
      setUserName("");
      setPassword("");
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <>
      <div id="login">
        <div className="login__container">
          <div className="login__input">
            <h1>Login</h1>
            <p className="login__details">
              Enter your email and password to log in!
            </p>
            <div className="login__form">
              <p>
                Username <span>*</span>
              </p>
              <input
                type="text"
                value={username}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div className="login__form">
              <p>
                Password <span>*</span>
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="login__check">
              <p>
                <input type="checkbox" />
                Keep me logged in
              </p>
            </div>
            <button onClick={handleSignIn}>Login</button>
          </div>
        </div>
        <div className="login__logo">
          <Image
            src="/Pngtree.png"
            alt="logo"
            width={148}
            height={134}
            priority
          ></Image>
          <p>Electratech</p>
        </div>
      </div>
    </>
  );
}
