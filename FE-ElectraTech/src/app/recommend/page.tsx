"use client";
import "@/styles/dashboard.css";
import "@/styles/recommend.css";
import Menu from "@/components/menu";
import Cookies from "js-cookie";
import { getDatabase, ref, child, get, set } from "firebase/database";
import { useState, useEffect, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase/config";
import Form from "react-bootstrap/Form";

interface RecommendData {
  [providerName: string]: {
    [day: string]:
      | Array<{
          time_stop?: string[];
        }>
      | undefined;
  };
}

interface DeviceDataItem {
  name: string;
  day: string;
  time: string;
  provider: string;
  index: number;
}

export default function Recommend() {
  const [user] = useAuthState(auth);
  const username = Cookies.get("username");
  const database = getDatabase();
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [deviceData, setDeviceData] = useState<DeviceDataItem[]>([]);
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});

  const toggleEditMode = (itemKey: string) => {
    setEditMode((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const handleTimeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    itemKey: string,
    index: number
  ) => {
    const newTime = event.target.value;
    setDeviceData((prevData) =>
      prevData.map((item) =>
        `${item.name}-${item.day}-${item.index}` === itemKey
          ? { ...item, time: newTime }
          : item
      )
    );
  };

  const saveDataToFirebase = async (item: DeviceDataItem) => {
    const branchName = `${item.name.replace("socket", "")}`;
    const itemRef = ref(
      database,
      `/Recommend/${item.provider}/${item.day}/${branchName}`
    );
    await set(itemRef, { time_stop: [item.time] });
    toggleEditMode(`${item.name}-${item.day}-${item.index}`);
  };

  const renderEditableTime = (item: DeviceDataItem) => {
    return editMode[`${item.name}-${item.day}-${item.index}`] ? (
      <>
        <input
          type="text"
          value={item.time}
          style={{ width: "100%", textAlign: "center" }}
          onChange={(e) =>
            handleTimeChange(
              e,
              `${item.name}-${item.day}-${item.index}`,
              item.index
            )
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              saveDataToFirebase(item);
            }
          }}
        />
      </>
    ) : (
      <div
        onDoubleClick={() =>
          toggleEditMode(`${item.name}-${item.day}-${item.index}`)
        }
      >
        {item.time}
      </div>
    );
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvider(event.target.value);
  };

  const processRecommendData = (recommendData: RecommendData) => {
    let processedData: DeviceDataItem[] = [];

    Object.keys(recommendData).forEach((providerName) => {
      const providerData = recommendData[providerName];

      Object.keys(providerData).forEach((day) => {
        const dayData = providerData[day];
        if (dayData) {
          dayData.forEach((socketData, index) => {
            if (socketData && socketData.time_stop) {
              const name = `socket${index}`;
              socketData.time_stop.forEach((timeRange, timeIndex) => {
                processedData.push({
                  name,
                  day,
                  time: timeRange,
                  provider: providerName,
                  index: timeIndex,
                });
              });
            }
          });
        }
      });
    });

    return processedData;
  };

  const fetchDataFromFirebase = useCallback(async () => {
    const recommendRef = ref(database, `/Recommend/${selectedProvider}`);
    const recommendSnapshot = await get(recommendRef);
    if (recommendSnapshot.exists()) {
      const recommendData = recommendSnapshot.val() as RecommendData;
      const formattedData = processRecommendData(recommendData);
      const dayOrder: { [key: string]: number } = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
        Sunday: 7,
      };

      const sortedData = formattedData.sort((a, b) => {
        if (a.name === b.name) {
          return dayOrder[a.day] - dayOrder[b.day];
        }
        return a.name.localeCompare(b.name);
      });
      setDeviceData(sortedData);
    } else {
      setDeviceData([]);
    }
  }, [database, selectedProvider]);

  const renderTableRows = (selectedProvider: string): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    const filteredData = deviceData.filter(
      (item) => item.provider === selectedProvider
    );
    const sockets = [...new Set(filteredData.map((item) => item.name))];
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    sockets.forEach((socket) => {
      const rowData = days.map((day) => {
        const dayData = filteredData.filter(
          (item) => item.name === socket && item.day === day
        );

        if (Array.isArray(dayData) && dayData.length > 0) {
          return (
            <td key={`${socket}-${day}`}>
              {dayData.map((item, index) => (
                <div
                  style={{ width: "60px" }}
                  key={`${socket}-${day}-${index}`}
                >
                  {renderEditableTime(item)}
                </div>
              ))}
            </td>
          );
        } else {
          return <td key={`${socket}-${day}`}>-</td>;
        }
      });

      rows.push(
        <tr key={socket}>
          <td>{socket}</td>
          {rowData}
        </tr>
      );
    });

    return rows;
  };

  const renderTableHeader = (): JSX.Element => {
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    return (
      <tr>
        <th>Socket</th>
        {days.map((day) => (
          <th key={day}>{day}</th>
        ))}
      </tr>
    );
  };

  const handleProviders = useCallback(async () => {
    try {
      const providerRef = ref(database, `UserAccount/${username}/Providers`);
      const providerSnapshot = await get(providerRef);
      if (providerSnapshot.exists()) {
        const providersString = providerSnapshot.val();
        const formattedProviders = providersString.split("-");
        setProviders(formattedProviders);
      }

      if (!selectedProvider) {
        return;
      }

      await fetchDataFromFirebase();

      if (deviceData.length === 0) {
        const apiUrl = `http://127.0.0.1:8000/api/chatbot/`;
        const requestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ outlet_name: selectedProvider }),
        };

        const response = await fetch(apiUrl, requestOptions);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        await response.json();

        await fetchDataFromFirebase();
      }
    } catch (e) {
      console.error(e);
    }
  }, [database, username, selectedProvider, deviceData, fetchDataFromFirebase]);

  useEffect(() => {
    handleProviders();
    fetchDataFromFirebase();
  }, [handleProviders, fetchDataFromFirebase]);

  return (
    <>
      <div id="dashboard">
        <Menu />
        <div className="dashboard__function">
          <table>
            <thead>
              <tr>
                <th>
                  <Form.Select
                    style={{ margin: "20px 0px 0px 20px" }}
                    onChange={handleSelectChange}
                    value={selectedProvider}
                  >
                    <option value=""></option>
                    {providers.map((provider) => (
                      <option key={provider}>{provider}</option>
                    ))}
                  </Form.Select>
                </th>
              </tr>

              {renderTableHeader()}
            </thead>
            <tbody>{renderTableRows(selectedProvider)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
