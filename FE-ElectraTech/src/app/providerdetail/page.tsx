"use client";
import React from "react";
import "@/styles/dashboard.css";
import "@/styles/providerdetail.css";
import Menu from "@/components/menu";
import { useState, useEffect } from "react";
import {
  getDatabase,
  ref,
  child,
  get,
  set,
  update,
  DataSnapshot,
  onValue,
  off,
} from "firebase/database";
import { auth } from "@/app/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCallback } from "react";
import BarChart from "@/components/barchart";
import Image from "next/image";
import Link from "next/link";
import Modal from "@/components/add-member";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";

export default function Recommend() {
  const [providerName, setProviderName] = useState("");
  const [sockets, setSockets] = useState([]);
  const [user] = useAuthState(auth);
  const database = getDatabase();
  const [electricData, setElectricData] = useState<number[]>([]);
  const [amountPaid, setAmountPaid] = useState("");
  const [kWh, setKWh] = useState("");
  const [showModalCreate, setShowModalCreate] = useState<boolean>(false);
  const [deviceStatus, setDeviceStatus] = useState<
    { id: string; status: string }[]
  >([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState<
    "success" | "danger" | "info"
  >();
  const [limit, setLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLimit = useCallback(
    async (providerName: string) => {
      try {
        const limitRef = ref(database, `PowerProviders/${providerName}/Limit`);
        const limitSnapshot = await get(limitRef);

        if (limitSnapshot.exists()) {
          setLimit(limitSnapshot.val());
        } else {
          setLimit(null);
        }
      } catch (error) {
        console.error("Error fetching limit:", error);
      }
    },
    [database]
  );

  const fetchDeviceStatus = useCallback(async () => {
    const statusRef = ref(database, `PowerProviders/${providerName}/Status`);

    const statusSnap = await get(statusRef);

    if (statusSnap.exists()) {
      const rawStatus = statusSnap.val();
      const parsedStatus = rawStatus.split(" ").map((item: string) => {
        const [id, status] = item.split(".");
        return { id, status };
      });

      setDeviceStatus(parsedStatus);
    }
  }, [database, providerName]);

  const handleButtonClick = async (index: number) => {
    try {
      const newDeviceStatus = [...deviceStatus];
      newDeviceStatus[index].status =
        newDeviceStatus[index].status === "t" ? "f" : "t";

      const statusUpdate = newDeviceStatus
        .map(({ id, status }) => `${id}.${status}`)
        .join(" ");

      let updatedStatus: string;
      let currentStatus: string;

      const currentStatusSnapshot = ref(
        database,
        `PowerProviders/${providerName}/Status`
      );

      onValue(currentStatusSnapshot, (snapshot) => {
        currentStatus = snapshot.val();
      });

      await update(ref(database, `PowerProviders/${providerName}/`), {
        StatusFromWeb: statusUpdate,
      });

      const updatedStatusSnapshot = ref(
        database,
        `PowerProviders/${providerName}/StatusFromWeb`
      );
      onValue(updatedStatusSnapshot, (snapshot) => {
        updatedStatus = snapshot.val();
      });
      setIsLoading(true);

      setTimeout(async () => {
        console.log(`Updated status: ${updatedStatus}`);
        console.log(`Current status: ${currentStatus}`);

        if (updatedStatus !== currentStatus) {
          console.error("Error: Status mismatch!");
          setAlertMessage("Error: Status mismatch!");
          setShowAlert(true);
          setAlertVariant("danger");
        } else {
          console.log("Status updated successfully!");
          setAlertMessage("Status updated successfully!");
          setShowAlert(true);
          setAlertVariant("success");
        }
        setIsLoading(false);
      }, 20000);
    } catch (error) {
      console.error("Error updating status:", error);
      setIsLoading(false);
    }
  };

  const fetchElectricData = useCallback(
    async (providerName: string) => {
      try {
        const trimmedProvider = providerName.trim();
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
            const matches = entryStr.match(/\d+.\d+(?=\s*Ws)/g);
            if (matches) {
              const sumElectric = matches.reduce(
                (acc, match) => acc + parseFloat(match),
                0
              );
              return { day: entry.day, sumElectric };
            }
            return null;
          });

          const filteredNumericValues = numericValues.filter(Boolean);

          const combinedElectricData = filteredNumericValues.reduce(
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
        } else {
          setElectricData(Array(7).fill(0));
        }
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

  const handleSockets = useCallback(async () => {
    try {
      const socketRef = ref(
        database,
        `PowerProviders/${providerName}/socketName`
      );
      console.log(`PowerProviders/${providerName}/socketName`);
      const socketSnapshot = await get(socketRef);
      if (socketSnapshot.exists()) {
        const socketString = socketSnapshot.val();
        const formattedSockets = socketString.split("-");
        setSockets(formattedSockets);
      }
    } catch (e) {
      console.error(e);
    }
  }, [database, providerName]);

  const handleConvertAndSave = async () => {
    const parsedKWh = parseFloat(kWh);

    if (isNaN(parsedKWh)) {
      setAlertMessage("Please enter a valid numeric value for kWh.");
      setShowAlert(true);
      setAlertVariant("danger");
      return;
    }

    await checkElectricUsage(providerName, parsedKWh.toString());
    setAmountPaid(parsedKWh.toString());

    const limitRef = ref(database, `PowerProviders/${providerName}/Limit`);
    try {
      await set(limitRef, parsedKWh);
      console.log(`Đã lưu ${parsedKWh} kWh vào Firebase.`);
      setAlertMessage("Set Limit Successful");
      setShowAlert(true);
      setAlertVariant("success");
    } catch (error) {
      setAlertMessage("Set Limit Failed");
      setShowAlert(true);
      setAlertVariant("danger");
      console.error("Lỗi khi lưu giá trị vào Firebase:", error);
    }
  };

  const getLatestDate = async (providerName: string) => {
    const electricAmountRef = ref(
      database,
      `PowerProviders/${providerName}/ElectricAmount`
    );
    const electricAmountSnapshot = await get(electricAmountRef);

    if (electricAmountSnapshot.exists()) {
      const electricDays = Object.keys(electricAmountSnapshot.val());
      const latestDate = electricDays.reduce((latest, current) => {
        return new Date(current) > new Date(latest) ? current : latest;
      }, electricDays[0]);

      return latestDate;
    }

    return null;
  };

  const checkElectricUsage = async (
    providerName: string,
    amountPaid: string
  ) => {
    try {
      const latestDate = await getLatestDate(providerName);

      if (!latestDate) {
        console.error("Không tìm thấy dữ liệu điện.");
        return;
      }

      const electricAmountRef = ref(
        database,
        `PowerProviders/${providerName}/ElectricAmount/${latestDate}`
      );
      const electricAmountSnapshot = await get(electricAmountRef);

      if (electricAmountSnapshot.exists()) {
        const electricDataForProvider: string[] = Object.values(
          electricAmountSnapshot.val()
        );

        console.log(`currentElectricAmount: ${electricDataForProvider}`);

        const numericValues = electricDataForProvider.flatMap((entry) => {
          console.log(`entry: ${JSON.stringify(entry)}`);
          const entryStr = JSON.stringify(entry);
          console.log(`entryStr: ${entryStr}`);
          const matches = entryStr.match(/\d+.\d+(?=\s*Ws)/g);
          if (matches) {
            const sumElectric = matches.reduce(
              (acc, match) => acc + parseFloat(match),
              0
            );
            return sumElectric;
          }
          return null;
        });

        const totalElectricUsage = numericValues.reduce(
          (acc: number | null, value: number | null) => {
            if (acc !== null && value !== null) {
              return acc + value;
            }
            return acc;
          },
          0
        );

        if (totalElectricUsage !== null) {
          const electricCost = calculateElectricCost(
            totalElectricUsage / 3600000
          );
          const parsedAmountPaid = parseFloat(amountPaid) / 30;

          console.log(electricCost);
          console.log(parsedAmountPaid);

          if (electricCost > parsedAmountPaid) {
            setTimeout(() => {
              setAlertMessage("Electric usage exceeds the limit");
              setShowAlert(true);
              setAlertVariant("danger");
            }, 3000);
          }
        }
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra số tiền điện:", error);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const nameParam = new URLSearchParams(window.location.search).get("name");
      setProviderName(nameParam?.trim() || "");
    }
    const handleElectricDataUpdate = (providerName: string) => {
      fetchElectricData(providerName);
    };

    const providersListener = ref(
      database,
      `PowerProviders/${providerName}/ElectricAmount`
    );
    onValue(providersListener, (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        handleElectricDataUpdate(providerName);
      }
    });

    const limitRef = ref(database, `PowerProviders/${providerName}/Limit`);
    const unsubscribeLimit = onValue(limitRef, (snapshot) => {
      if (snapshot.exists()) {
        setLimit(snapshot.val());
      } else {
        setLimit(null);
      }
    });

    handleSockets();
    fetchElectricData(providerName);
    fetchDeviceStatus();
    fetchLimit(providerName);
    return () => {
      off(providersListener);
      unsubscribeLimit();
    };
  }, [
    handleSockets,
    fetchElectricData,
    providerName,
    fetchDeviceStatus,
    fetchLimit,
    database,
  ]);
  return (
    <>
      <div id="dashboard">
        <Menu />
        <div className="dashboard__function">
          <div className="dashboard__filter">
            {showAlert && (
              <Alert
                variant={alertVariant}
                onClose={() => setShowAlert(false)}
                dismissible
              >
                {alertMessage}
              </Alert>
            )}
            <div style={{ display: "flex", gap: "12px" }}>
              <h1 className="provider__title">{providerName}</h1>
              {isLoading && <Spinner animation="border" variant="primary" />}
            </div>
            <div className="dashboard__room">
              {sockets.map((socket, index) => (
                <div key={index} className="dashboard__room-details">
                  <div>
                    <div>
                      <Form.Check
                        onClick={() => handleButtonClick(index)}
                        type="switch"
                        defaultChecked={deviceStatus[index].status === "t"}
                      />
                    </div>
                  </div>
                  <h1>{socket}</h1>
                </div>
              ))}
            </div>
            <div className="dashboard__level">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h1>Levels</h1>
                <Link
                  href="/showchart"
                  style={{ textDecoration: "none", color: "black" }}
                >
                  Detail
                </Link>
              </div>
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
                <BarChart
                  data={electricData}
                  thresholdValue={limit ? limit / 30 : 0}
                />
              </div>
            </div>
            <div className="dashboard__provider">
              <h1>
                Consumer Aim
                <button
                  style={{ marginLeft: "10px" }}
                  className="provider__desc"
                  onClick={() => {
                    setShowAlert(true);
                    setAlertMessage(
                      "Set a limit of the amount you want, if exceeded, a warning will be issued"
                    );
                    setAlertVariant("info");
                  }}
                >
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
              </h1>
              <input
                style={{ paddingLeft: "12px" }}
                className="provider__consumer"
                type="text"
                placeholder="Enter money"
                onChange={(e) => setKWh(e.target.value)}
              />
              <Button
                style={{ marginLeft: "12px" }}
                onClick={handleConvertAndSave}
              >
                Save
              </Button>
            </div>
          </div>
          <div className="dashboard__assistant">
            <div className="dashboard__member">
              <div className="dashboard__title">
                <h1>Members</h1>
                <Link href="/member">
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
                      priority
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
                      priority
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
                      priority
                    ></Image>
                    <div>
                      <h1>Jenifer Feroz</h1>
                      <p>Member</p>
                    </div>
                  </div>
                  <button onClick={() => setShowModalCreate(true)}>
                    Add Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        showModalCreate={showModalCreate}
        setShowModalCreate={setShowModalCreate}
        providerName={providerName}
      />
    </>
  );
}
