"use client";
import "@/styles/dashboard.css";
import Image from "next/image";
import Menu from "@/components/menu";
import Link from "next/link";
import {
  getDatabase,
  ref,
  child,
  get,
  onValue,
  off,
  DataSnapshot,
} from "firebase/database";
import { auth } from "@/app/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import Cookies from "js-cookie";
import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/create-modal";
import BarChart from "@/components/barchart";

function Dashboard() {
  const [user] = useAuthState(auth);
  const database = getDatabase();
  const username = Cookies.get("username");
  const [providers, setProviders] = useState([]);
  const [roomNames, setRoomNames] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [showModalCreate, setShowModalCreate] = useState<boolean>(false);
  const [electricData, setElectricData] = useState<number[]>([]);
  const [clickedRoom, setClickedRoom] = useState<string>("");

  const fetchElectricData = useCallback(
    async (roomName: string, roomProviders: string[]) => {
      try {
        const electricDataPromises = roomProviders.map(async (provider) => {
          const trimmedProvider = provider.trim();
          const electricAmountRef = ref(
            database,
            `PowerProviders/${trimmedProvider}/ElectricAmount`
          );
          const electricAmountSnapshot = await get(electricAmountRef);

          if (electricAmountSnapshot.exists()) {
            const electricDataForProvider: string[] = Object.values(
              electricAmountSnapshot.val()
            );

            const electricDay: string[] = Object.keys(
              electricAmountSnapshot.val()
            );

            const combinedData = electricDay.map((day, index) => {
              const dateParts = day.split("-");
              const inputDate = new Date(
                parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0])
              );
              const days = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ];
              const dayOfWeek = days[inputDate.getDay()];
              return { day: dayOfWeek, data: electricDataForProvider[index] };
            });

            const numericValues = combinedData.flatMap((entry) => {
              const entryStr = JSON.stringify(entry);
              const matches = entryStr.match(/\d+\.\d+(?=\s*Ws)/g);
              if (matches) {
                const sumElectric = matches.reduce(
                  (acc, match) => acc + parseFloat(match),
                  0
                );
                return { day: entry.day, sumElectric };
              }
              return null;
            });

            return numericValues.filter(Boolean);
          }

          return [];
        });

        const allElectricData = await Promise.all(electricDataPromises);
        const flattenedElectricData = allElectricData.flat();

        const combinedElectricData = flattenedElectricData.reduce(
          (acc: { day: string; sumElectric: number }[], entry) => {
            if (entry) {
              const existingEntry = acc.find(
                (item: { day: string }) => item.day === entry.day
              );
              if (existingEntry) {
                existingEntry.sumElectric += entry.sumElectric;
              } else {
                acc.push(entry);
              }
            }
            return acc;
          },
          []
        );

        const daysOrder = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];

        const defaultElectricData = Array(7).fill(0);
        combinedElectricData.forEach((entry) => {
          const kWh = entry.sumElectric / 3600000;
          const cost = Math.round(calculateElectricCost(kWh));

          const dayIndex = daysOrder.indexOf(entry.day);
          if (dayIndex !== -1) {
            defaultElectricData[dayIndex] = cost;
          }
        });

        setElectricData(defaultElectricData);
      } catch (e) {
        console.error(e);
      }
    },
    [database]
  );

  const calculateElectricCost = (kWh: number) => {
    if (kWh <= 50) return kWh * 1806;
    if (kWh <= 100) return 50 * 1806 + (kWh - 50) * 1866;
    if (kWh <= 200) return 50 * 1806 + 50 * 1866 + (kWh - 100) * 2167;
    if (kWh <= 300)
      return 50 * 1806 + 50 * 1866 + 100 * 2167 + (kWh - 200) * 2729;
    if (kWh <= 400)
      return (
        50 * 1806 + 50 * 1866 + 100 * 2167 + 100 * 2729 + (kWh - 300) * 3050
      );
    return (
      50 * 1806 +
      50 * 1866 +
      100 * 2167 +
      100 * 2729 +
      100 * 3050 +
      (kWh - 400) * 3151
    );
  };

  useEffect(() => {
    const providerRef = ref(database, `UserAccount/${username}/Providers`);
    const roomNamesRef = ref(database, `UserAccount/${username}/Rooms`);

    const unsubscribeProviders = onValue(
      providerRef,
      (snapshot: DataSnapshot) => {
        if (snapshot.exists()) {
          const providersString = snapshot.val();
          const formattedProviders = providersString.split("-");
          setProviders(formattedProviders);
        }
      }
    );

    const unsubscribeRoomNames = onValue(
      roomNamesRef,
      (snapshot: DataSnapshot) => {
        if (snapshot.exists()) {
          const roomNamesArray = Object.keys(snapshot.val());
          setRoomNames(roomNamesArray);
        }
      }
    );

    const handleElectricDataUpdate = (
      roomName: string,
      roomProviders: string[]
    ) => {
      fetchElectricData(roomName, roomProviders);
    };

    const roomProvidersListener = ref(database, `PowerProviders`);
    onValue(roomProvidersListener, (snapshot) => {
      if (snapshot.exists()) {
        const roomProvidersData = snapshot.val();
        const updatedRoomProviders = Object.keys(roomProvidersData);
        handleElectricDataUpdate(selectedRoom, updatedRoomProviders);
      }
    });

    return () => {
      off(roomProvidersListener);
      off(providerRef);
      off(roomNamesRef);
      unsubscribeProviders();
      unsubscribeRoomNames();
    };
  }, [username, database, selectedRoom, fetchElectricData]);

  const handleProviders = async () => {
    try {
      const providerRef = ref(database, `UserAccount/${username}/Providers`);
      const providerSnapshot = await get(providerRef);
      if (providerSnapshot.exists()) {
        const providersString = providerSnapshot.val();
        const formattedProviders = providersString.split("-");
        setProviders(formattedProviders);
      }
    } catch (e) {
      console.error(e);
    }
  };
  const handleRoomNames = async () => {
    try {
      const roomNamesRef = ref(database, `UserAccount/${username}/Rooms`);
      const roomNamesSnapshot = await get(roomNamesRef);
      if (roomNamesSnapshot.exists()) {
        const roomNamesArray = Object.keys(roomNamesSnapshot.val());
        setRoomNames(roomNamesArray);
      }
    } catch (e) {
      console.error(e);
    }
  };
  const handleRoomClick = async (roomName: string) => {
    try {
      setClickedRoom(roomName);
      let formattedRoomProviders = [];

      if (roomName === "Remain Room") {
        setSelectedRoom("Remain Room");
        const allProviders = (await fetchAllProviders()).map(
          (provider: string) => provider.trim()
        );
        const providersInRooms = (await fetchProvidersInRooms()).map(
          (provider) => provider.trim()
        );
        formattedRoomProviders = allProviders.filter(
          (provider: string) => !providersInRooms.includes(provider.trim())
        );
      } else if (roomName === "All Devices") {
        setSelectedRoom("All Devices");
        const allProviders = await fetchAllProviders();
        formattedRoomProviders = allProviders;
      } else {
        setSelectedRoom(roomName);
        const roomProvidersRef = ref(
          database,
          `UserAccount/${username}/Rooms/${roomName}`
        );
        const roomProvidersSnapshot = await get(roomProvidersRef);
        if (roomProvidersSnapshot.exists()) {
          const roomProvidersString = roomProvidersSnapshot.val();
          formattedRoomProviders = roomProvidersString.split("-");
        }
      }
      await fetchElectricData(roomName, formattedRoomProviders);

      setProviders(formattedRoomProviders);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllProviders = async () => {
    try {
      const providersRef = ref(database, `UserAccount/${username}/Providers`);
      const providersSnapshot = await get(providersRef);
      if (providersSnapshot.exists()) {
        const providersString = providersSnapshot.val();
        const allProviders = providersString.split("-");
        return allProviders;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const fetchProvidersInRooms = async () => {
    try {
      const providersInRooms = [];
      for (const roomName of roomNames) {
        const roomProvidersRef = ref(
          database,
          `UserAccount/${username}/Rooms/${roomName}`
        );
        const roomProvidersSnapshot = await get(roomProvidersRef);
        if (roomProvidersSnapshot.exists()) {
          const roomProvidersString = roomProvidersSnapshot.val();
          const formattedRoomProviders = roomProvidersString.split("-");
          providersInRooms.push(...formattedRoomProviders);
        }
      }
      return providersInRooms;
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  return (
    <>
      <div id="dashboard">
        <Menu />
        <div className="dashboard__function">
          <div className="dashboard__filter">
            <div className="dashboard__search">
              <h1>Rooms</h1>
              <input type="text" placeholder="Search Anything Here..." />
            </div>
            <div className="dashboard__room">
              <div
                onClick={() => setShowModalCreate(true)}
                className="dashboard__room-details"
              >
                <div>
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="white"
                      className="bi bi-plus-lg"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"
                      />
                    </svg>
                  </div>
                </div>
                <h1>Add</h1>
              </div>
              <div
                onClick={() => handleRoomClick("All Devices")}
                className="dashboard__room-details"
              >
                <div>
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="25"
                      height="24"
                      viewBox="0 0 25 24"
                      fill="none"
                    >
                      <g clipPath="url(#clip0_415_102)">
                        <path
                          d="M12.1335 14.625C12.0331 14.6244 11.934 14.5997 11.8436 14.5528L1.73253 9.43222C1.61673 9.3739 1.51881 9.28147 1.45022 9.16572C1.38164 9.04998 1.34521 8.91571 1.34521 8.77861C1.34521 8.64151 1.38164 8.50725 1.45022 8.3915C1.51881 8.27576 1.61673 8.18333 1.73253 8.125L11.8436 3.00445C11.9333 2.95935 12.0311 2.93597 12.1301 2.93597C12.2292 2.93597 12.327 2.95935 12.4166 3.00445L22.5277 8.125C22.6435 8.18333 22.7414 8.27576 22.81 8.3915C22.8786 8.50725 22.915 8.64151 22.915 8.77861C22.915 8.91571 22.8786 9.04998 22.81 9.16572C22.7414 9.28147 22.6435 9.3739 22.5277 9.43222L12.4166 14.5528C12.3283 14.5987 12.2316 14.6233 12.1335 14.625ZM3.59972 8.78222L12.1335 13.1156L20.6673 8.78222L12.1335 4.46333L3.59972 8.78222Z"
                          fill="white"
                        />
                        <path
                          d="M12.1335 18.8933C12.033 18.8927 11.934 18.868 11.8436 18.8211L1.7325 13.7222C1.65072 13.6831 1.57704 13.6268 1.51578 13.5568C1.45451 13.4868 1.40689 13.4044 1.37569 13.3144C1.3445 13.2244 1.33035 13.1287 1.33408 13.0328C1.33781 12.9369 1.35935 12.8427 1.39743 12.7559C1.43551 12.669 1.48936 12.5911 1.55586 12.5268C1.62235 12.4625 1.70014 12.413 1.78468 12.3813C1.86923 12.3495 1.95883 12.3362 2.04824 12.342C2.13766 12.3478 2.22511 12.3726 2.30547 12.415L12.1335 17.3767L21.9547 12.4006C22.0357 12.3598 22.1234 12.3365 22.2128 12.332C22.3022 12.3275 22.3916 12.342 22.4758 12.3745C22.5599 12.407 22.6373 12.457 22.7035 12.5216C22.7697 12.5862 22.8233 12.6641 22.8614 12.7508C22.8994 12.8376 22.9212 12.9316 22.9253 13.0274C22.9295 13.1231 22.916 13.2189 22.8857 13.3091C22.8553 13.3993 22.8087 13.4822 22.7484 13.5531C22.6881 13.624 22.6154 13.6814 22.5344 13.7222L12.4233 18.8428C12.3313 18.8823 12.2324 18.8995 12.1335 18.8933Z"
                          fill="white"
                        />
                        <path
                          d="M12.1331 23.1617C12.0327 23.161 11.9336 23.1364 11.8432 23.0894L1.73214 17.9689C1.57372 17.8853 1.45226 17.7384 1.39387 17.5598C1.33548 17.3813 1.34482 17.1853 1.41989 17.014C1.49495 16.8428 1.62975 16.7099 1.79528 16.644C1.96082 16.5781 2.14388 16.5845 2.3051 16.6617L12.1331 21.6667L21.9544 16.6906C22.0347 16.6481 22.1222 16.6233 22.2116 16.6175C22.301 16.6117 22.3906 16.6251 22.4751 16.6568C22.5597 16.6886 22.6375 16.738 22.704 16.8024C22.7705 16.8667 22.8243 16.9445 22.8624 17.0314C22.9005 17.1183 22.922 17.2124 22.9257 17.3083C22.9295 17.4042 22.9153 17.5 22.8841 17.5899C22.8529 17.6799 22.8053 17.7623 22.7441 17.8323C22.6828 17.9024 22.6091 17.9586 22.5273 17.9978L12.423 23.1111C12.331 23.1506 12.232 23.1678 12.1331 23.1617Z"
                          fill="white"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_415_102">
                          <rect width="24.2667" height="26" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                </div>
                <h1>All devices</h1>
              </div>
              {roomNames.map((roomName, index) => (
                <div
                  key={index}
                  className={`dashboard__room-details ${
                    clickedRoom === roomName ? "clicked" : ""
                  }`}
                  onClick={() => handleRoomClick(roomName)}
                >
                  <div>
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="25"
                        height="24"
                        viewBox="0 0 25 24"
                        fill="none"
                      >
                        <g clipPath="url(#clip0_415_102)">
                          <path
                            d="M12.1335 14.625C12.0331 14.6244 11.934 14.5997 11.8436 14.5528L1.73253 9.43222C1.61673 9.3739 1.51881 9.28147 1.45022 9.16572C1.38164 9.04998 1.34521 8.91571 1.34521 8.77861C1.34521 8.64151 1.38164 8.50725 1.45022 8.3915C1.51881 8.27576 1.61673 8.18333 1.73253 8.125L11.8436 3.00445C11.9333 2.95935 12.0311 2.93597 12.1301 2.93597C12.2292 2.93597 12.327 2.95935 12.4166 3.00445L22.5277 8.125C22.6435 8.18333 22.7414 8.27576 22.81 8.3915C22.8786 8.50725 22.915 8.64151 22.915 8.77861C22.915 8.91571 22.8786 9.04998 22.81 9.16572C22.7414 9.28147 22.6435 9.3739 22.5277 9.43222L12.4166 14.5528C12.3283 14.5987 12.2316 14.6233 12.1335 14.625ZM3.59972 8.78222L12.1335 13.1156L20.6673 8.78222L12.1335 4.46333L3.59972 8.78222Z"
                            fill="white"
                          />
                          <path
                            d="M12.1335 18.8933C12.033 18.8927 11.934 18.868 11.8436 18.8211L1.7325 13.7222C1.65072 13.6831 1.57704 13.6268 1.51578 13.5568C1.45451 13.4868 1.40689 13.4044 1.37569 13.3144C1.3445 13.2244 1.33035 13.1287 1.33408 13.0328C1.33781 12.9369 1.35935 12.8427 1.39743 12.7559C1.43551 12.669 1.48936 12.5911 1.55586 12.5268C1.62235 12.4625 1.70014 12.413 1.78468 12.3813C1.86923 12.3495 1.95883 12.3362 2.04824 12.342C2.13766 12.3478 2.22511 12.3726 2.30547 12.415L12.1335 17.3767L21.9547 12.4006C22.0357 12.3598 22.1234 12.3365 22.2128 12.332C22.3022 12.3275 22.3916 12.342 22.4758 12.3745C22.5599 12.407 22.6373 12.457 22.7035 12.5216C22.7697 12.5862 22.8233 12.6641 22.8614 12.7508C22.8994 12.8376 22.9212 12.9316 22.9253 13.0274C22.9295 13.1231 22.916 13.2189 22.8857 13.3091C22.8553 13.3993 22.8087 13.4822 22.7484 13.5531C22.6881 13.624 22.6154 13.6814 22.5344 13.7222L12.4233 18.8428C12.3313 18.8823 12.2324 18.8995 12.1335 18.8933Z"
                            fill="white"
                          />
                          <path
                            d="M12.1331 23.1617C12.0327 23.161 11.9336 23.1364 11.8432 23.0894L1.73214 17.9689C1.57372 17.8853 1.45226 17.7384 1.39387 17.5598C1.33548 17.3813 1.34482 17.1853 1.41989 17.014C1.49495 16.8428 1.62975 16.7099 1.79528 16.644C1.96082 16.5781 2.14388 16.5845 2.3051 16.6617L12.1331 21.6667L21.9544 16.6906C22.0347 16.6481 22.1222 16.6233 22.2116 16.6175C22.301 16.6117 22.3906 16.6251 22.4751 16.6568C22.5597 16.6886 22.6375 16.738 22.704 16.8024C22.7705 16.8667 22.8243 16.9445 22.8624 17.0314C22.9005 17.1183 22.922 17.2124 22.9257 17.3083C22.9295 17.4042 22.9153 17.5 22.8841 17.5899C22.8529 17.6799 22.8053 17.7623 22.7441 17.8323C22.6828 17.9024 22.6091 17.9586 22.5273 17.9978L12.423 23.1111C12.331 23.1506 12.232 23.1678 12.1331 23.1617Z"
                            fill="white"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_415_102">
                            <rect width="24.2667" height="26" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                    </div>
                  </div>
                  <h1>{roomName}</h1>
                </div>
              ))}
              <div
                onClick={() => handleRoomClick("Remain Room")}
                className="dashboard__room-details"
              >
                <div>
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="25"
                      height="24"
                      viewBox="0 0 25 24"
                      fill="none"
                    >
                      <g clipPath="url(#clip0_415_102)">
                        <path
                          d="M12.1335 14.625C12.0331 14.6244 11.934 14.5997 11.8436 14.5528L1.73253 9.43222C1.61673 9.3739 1.51881 9.28147 1.45022 9.16572C1.38164 9.04998 1.34521 8.91571 1.34521 8.77861C1.34521 8.64151 1.38164 8.50725 1.45022 8.3915C1.51881 8.27576 1.61673 8.18333 1.73253 8.125L11.8436 3.00445C11.9333 2.95935 12.0311 2.93597 12.1301 2.93597C12.2292 2.93597 12.327 2.95935 12.4166 3.00445L22.5277 8.125C22.6435 8.18333 22.7414 8.27576 22.81 8.3915C22.8786 8.50725 22.915 8.64151 22.915 8.77861C22.915 8.91571 22.8786 9.04998 22.81 9.16572C22.7414 9.28147 22.6435 9.3739 22.5277 9.43222L12.4166 14.5528C12.3283 14.5987 12.2316 14.6233 12.1335 14.625ZM3.59972 8.78222L12.1335 13.1156L20.6673 8.78222L12.1335 4.46333L3.59972 8.78222Z"
                          fill="white"
                        />
                        <path
                          d="M12.1335 18.8933C12.033 18.8927 11.934 18.868 11.8436 18.8211L1.7325 13.7222C1.65072 13.6831 1.57704 13.6268 1.51578 13.5568C1.45451 13.4868 1.40689 13.4044 1.37569 13.3144C1.3445 13.2244 1.33035 13.1287 1.33408 13.0328C1.33781 12.9369 1.35935 12.8427 1.39743 12.7559C1.43551 12.669 1.48936 12.5911 1.55586 12.5268C1.62235 12.4625 1.70014 12.413 1.78468 12.3813C1.86923 12.3495 1.95883 12.3362 2.04824 12.342C2.13766 12.3478 2.22511 12.3726 2.30547 12.415L12.1335 17.3767L21.9547 12.4006C22.0357 12.3598 22.1234 12.3365 22.2128 12.332C22.3022 12.3275 22.3916 12.342 22.4758 12.3745C22.5599 12.407 22.6373 12.457 22.7035 12.5216C22.7697 12.5862 22.8233 12.6641 22.8614 12.7508C22.8994 12.8376 22.9212 12.9316 22.9253 13.0274C22.9295 13.1231 22.916 13.2189 22.8857 13.3091C22.8553 13.3993 22.8087 13.4822 22.7484 13.5531C22.6881 13.624 22.6154 13.6814 22.5344 13.7222L12.4233 18.8428C12.3313 18.8823 12.2324 18.8995 12.1335 18.8933Z"
                          fill="white"
                        />
                        <path
                          d="M12.1331 23.1617C12.0327 23.161 11.9336 23.1364 11.8432 23.0894L1.73214 17.9689C1.57372 17.8853 1.45226 17.7384 1.39387 17.5598C1.33548 17.3813 1.34482 17.1853 1.41989 17.014C1.49495 16.8428 1.62975 16.7099 1.79528 16.644C1.96082 16.5781 2.14388 16.5845 2.3051 16.6617L12.1331 21.6667L21.9544 16.6906C22.0347 16.6481 22.1222 16.6233 22.2116 16.6175C22.301 16.6117 22.3906 16.6251 22.4751 16.6568C22.5597 16.6886 22.6375 16.738 22.704 16.8024C22.7705 16.8667 22.8243 16.9445 22.8624 17.0314C22.9005 17.1183 22.922 17.2124 22.9257 17.3083C22.9295 17.4042 22.9153 17.5 22.8841 17.5899C22.8529 17.6799 22.8053 17.7623 22.7441 17.8323C22.6828 17.9024 22.6091 17.9586 22.5273 17.9978L12.423 23.1111C12.331 23.1506 12.232 23.1678 12.1331 23.1617Z"
                          fill="white"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_415_102">
                          <rect width="24.2667" height="26" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                </div>
                <h1>Remain Room</h1>
              </div>
            </div>

            <div className="dashboard__level">
              <h1>Levels</h1>
              <div className="dashboard__table">
                <div className="dashboard__option">
                  <div className="dashboard__icon">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="26"
                        height="29"
                        viewBox="0 0 26 29"
                        fill="none"
                      >
                        <path
                          d="M0.183265 28.343C0.183265 28.343 23.7868 10.5768 23.79 10.5742L25.1182 9.55889C22.517 9.40929 16.8303 8.87459 16.7851 8.91615C18.1647 7.71337 24.2627 2.27924 24.359 2.31198C22.2341 1.58955 20.1092 0.867122 17.9844 0.144709L15.5155 2.84691L6.19112 12.5131L14.5347 13.0999L0.183265 28.343Z"
                          fill="white"
                        />
                      </svg>
                    </div>
                    <p>Money</p>
                  </div>
                  <select>
                    <option value="option1">Hour</option>
                    <option value="option2">Day</option>
                    <option value="option3">Week</option>
                    <option value="option4">Month</option>
                    <option value="option5">Year</option>
                  </select>
                </div>
                <BarChart data={electricData} />
              </div>
            </div>
            <div className="dashboard__provider">
              <div>
                <h1>Electric Providers</h1>
                <div className="dashboard__provider-details">
                  {providers.map((provider, index) => (
                    <div key={index}>
                      <Link
                        href={`/providerdetail?name=${provider}`}
                        style={{ textDecoration: "none", color: "#5C5C5C" }}
                      >
                        <p>{provider}</p>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="dashboard__assistant">
            <div className="dashboard__alert">
              <button>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 18 21"
                  fill="none"
                >
                  <path
                    d="M10.8549 17.6373C11.1324 17.3897 11.5582 17.3743 11.8544 17.6173C12.1802 17.8846 12.2259 18.3632 11.9564 18.6864C11.2921 19.548 10.2642 20.0577 9.17061 20.0678L8.95348 20.0587C7.94518 19.9855 7.01195 19.4883 6.39367 18.6864L6.32796 18.5947C6.13479 18.2779 6.19947 17.8603 6.49569 17.6173C6.82154 17.35 7.30415 17.3953 7.57364 17.7185C7.692 17.8754 7.83242 18.0147 7.99063 18.132C8.4135 18.4443 8.94454 18.5762 9.4659 18.4986C9.98726 18.4209 10.4558 18.1401 10.7676 17.7185H10.7764L10.8549 17.6373ZM9.17948 0.0678101C12.2492 0.0678101 15.6915 2.23235 16.0819 5.70793V7.52052C16.2152 8.17472 16.5214 8.78204 16.9691 9.2803C16.9956 9.3104 17.0194 9.34279 17.0401 9.37709C17.446 9.98819 17.6789 10.6963 17.7144 11.4272L17.6877 11.612C17.7183 12.6123 17.3845 13.5901 16.7473 14.3661C15.9336 15.2441 14.8213 15.7925 13.6244 15.9059C10.676 16.2296 7.70068 16.2296 4.75234 15.9059C3.5729 15.7848 2.47992 15.2365 1.68263 14.3661C1.03497 13.6012 0.691103 12.6281 0.715578 11.6296V11.5064C0.764355 10.7536 1.01556 10.0275 1.44308 9.40349L1.51406 9.3155C1.95867 8.81514 2.26441 8.20869 2.40126 7.55571V5.74313L2.45032 5.64187C2.59948 5.3848 2.88999 5.23445 3.19424 5.26737C3.53653 5.3044 3.8114 5.56421 3.86514 5.90151V7.71409C3.86859 7.74626 3.86859 7.77871 3.86514 7.81088C3.68041 8.71863 3.25817 9.56223 2.6408 10.257C2.40305 10.6326 2.26848 11.0633 2.25044 11.5064V11.7C2.23074 12.3232 2.43868 12.9326 2.83599 13.4158C3.38682 13.9801 4.12342 14.3297 4.91204 14.4013C7.76632 14.7093 10.6459 14.7093 13.5001 14.4013C14.3103 14.3275 15.0649 13.9612 15.6206 13.3718C15.9984 12.9 16.1963 12.3111 16.1795 11.7088V11.5064C16.1613 11.0618 16.0301 10.629 15.798 10.2482C15.1549 9.56131 14.7079 8.71703 14.5027 7.80208C14.4992 7.76991 14.4992 7.73747 14.5027 7.70529V5.88391C14.2454 3.22663 11.5749 1.58123 9.25045 1.58123C8.26221 1.57897 7.29023 1.83058 6.42915 2.31154L6.32369 2.36389C6.10688 2.45144 5.85883 2.43607 5.65267 2.31724C5.41215 2.17861 5.26676 1.92114 5.27326 1.64531C5.27976 1.36949 5.43712 1.11904 5.68391 0.991699C6.7509 0.393881 7.95402 0.0758928 9.17948 0.0678101Z"
                    fill="#6C7894"
                  />
                </svg>
              </button>
              <button>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 25 25"
                  fill="none"
                >
                  <g clipPath="url(#clip0_1_75)">
                    <path
                      d="M9.30432 9.06781C9.53943 8.39948 10.0035 7.83591 10.6143 7.47694C11.2251 7.11797 11.9432 6.98675 12.6415 7.10652C13.3398 7.22629 13.9731 7.58933 14.4294 8.13134C14.8857 8.67334 15.1354 9.35933 15.1343 10.0678C15.1343 12.0678 12.1343 13.0678 12.1343 13.0678"
                      stroke="#6C7894"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12.2144 17.0678H12.2244"
                      stroke="#6C7894"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12.2144 21.0678C17.7372 21.0678 22.2144 16.5907 22.2144 11.0678C22.2144 5.54496 17.7372 1.06781 12.2144 1.06781C8.88102 1.06781 2.21436 3.06781 2.21436 11.0678"
                      stroke="#6C7894"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4.2638 17.1319C7.61339 21.523 13.8885 22.3674 18.2796 19.0178C22.6708 15.6682 23.5151 9.39309 20.1655 5.00195"
                      stroke="#6C7894"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_1_75">
                      <rect
                        width="24"
                        height="24"
                        fill="white"
                        transform="translate(0.214355 0.0678101)"
                      />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
            <div className="dashboard__member">
              <div className="dashboard__title">
                <h1>Members</h1>
                <Link style={{ textDecoration: "none" }} href="/member">
                  <p>View all</p>
                </Link>
              </div>
              <div className="dashboard__member-details">
                <div>
                  <div className="dashboard__people">
                    <Image
                      style={{ marginTop: "12px" }}
                      src="/Rectangle 2.png"
                      alt="logo"
                      width={48}
                      height={48}
                      className="img"
                    ></Image>
                    <div>
                      <h1>Jenifer Feroz</h1>
                      <p>Member</p>
                    </div>
                  </div>
                  <div className="dashboard__people">
                    <Image
                      style={{ marginTop: "12px" }}
                      src="/Rectangle 2.png"
                      alt="logo"
                      width={48}
                      height={48}
                      className="img"
                    ></Image>
                    <div>
                      <h1>Jenifer Feroz</h1>
                      <p>Member</p>
                    </div>
                  </div>
                  <div className="dashboard__people">
                    <Image
                      style={{ marginTop: "12px" }}
                      src="/Rectangle 2.png"
                      alt="logo"
                      width={48}
                      height={48}
                      className="img"
                    ></Image>
                    <div>
                      <h1>Jenifer Feroz</h1>
                      <p>Member</p>
                    </div>
                  </div>
                  <button>Add Member</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        showModalCreate={showModalCreate}
        setShowModalCreate={setShowModalCreate}
        providers={providers}
        username={username}
      />
    </>
  );
}
export default Dashboard;
