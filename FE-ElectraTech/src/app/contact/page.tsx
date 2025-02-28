"use client";
import { useState } from "react";
import "@/styles/dashboard.css";
import "@/styles/contact.css";
import Menu from "@/components/menu";
import Image from "next/image";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    window.Email.send({
      Host: "smtp.your-email-provider.com",
      Username: "your-email@example.com",
      Password: "your-email-password",
      To: "ducpd82@gmail.com",
      From: formData.email,
      Subject: `New message from ${formData.name}`,
      Body: formData.message,
    }).then((message: string) => alert("Email sent successfully!"));
  };

  return (
    <>
      <div id="dashboard">
        <Menu />
        <div className="dashboard__function">
          <div className="contact__container">
            <form id="user-form" onSubmit={handleSubmit}>
              <Image
                width={64}
                height={64}
                src="/Pngtree.png"
                alt="Chat Icon"
              />
              <h1>ELECTRATECH</h1>
              <label htmlFor="name">Name:</label>
              <br />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
              <br />

              <label htmlFor="email">Email:</label>
              <br />
              <input
                type="text"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
              <br />

              <label htmlFor="message">Message:</label>
              <br />
              <input
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
              ></input>
              <br />
              <button type="submit">Submit</button>
            </form>
            <Image
              width={280}
              height={280}
              src="/contact.png"
              alt="Chat Icon"
            />
          </div>
        </div>
      </div>

      <script src="https://smtpjs.com/v3/smtp.js" async></script>
    </>
  );
}

export default Contact;
