"use client";
import "@/styles/dashboard.css";
import "@/styles/profile.css";
import Menu from "@/components/menu";
import Image from "next/image";
import Cookies from "js-cookie";

function Profile() {
  const username = Cookies.get("username");
  return (
    <>
      <div id="dashboard">
        <Menu />
        <div className="dashboard__function">
          <div className="profile">
            <form id="user">
              <div className="form">
                <label htmlFor="username">Username:</label>
                <br />
                <input
                  type="text-form"
                  defaultValue={username}
                  id="username"
                  name="username"
                />
              </div>
              <br />
              <div className="form">
                <label htmlFor="name">Name:</label>
                <br />
                <input type="text-form" id="name" name="name" />
              </div>
              <br />
              <div className="form">
                <label htmlFor="address">Address:</label>
                <br />
                <input type="text-form" id="address" name="address" />
              </div>
              <br />
              <div className="form">
                <label htmlFor="contact">Contact No:</label>
                <br />
                <input type="tel" id="contact" name="contact" />
              </div>
              <br />
              <div className="form">
                <label htmlFor="password">Password:</label>
                <br />
                <input type="password" id="password" name="password" />
              </div>
              <br />
            </form>
            <div className="profile__set">
              <Image
                width={282}
                height={282}
                src="/profile.png"
                alt="Chat Icon"
              />
              <div className="profile__button">
                <button>Edit</button>
                <button>Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default Profile;
