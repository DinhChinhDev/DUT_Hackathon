"use client";
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { auth } from "@/app/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import "firebase/database";
import { getDatabase, ref, onValue } from "firebase/database";
import Menu from "@/components/menu";

interface ChartData {
  timestamp: string;
  electricAmount1: number;
  electricAmount2: number;
  electricAmount3: number;
}

const ChartComponent = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [user] = useAuthState(auth);
  const database = getDatabase();
  const databaseRef = ref(
    database,
    "/PowerProviders/thanhvjp1/ElectricAmountShow"
  );

  useEffect(() => {
    let isMounted = true;

    const fetchData = () => {
      onValue(databaseRef, (snapshot) => {
        if (isMounted && snapshot.exists()) {
          const chartData: ChartData[] = [];
          snapshot.forEach((hourSnapshot) => {
            hourSnapshot.forEach((minuteSnapshot) => {
              minuteSnapshot.forEach((secondSnapshot) => {
                const timestamp = `${hourSnapshot.key}:${minuteSnapshot.key}:${secondSnapshot.key}`;
                const electricAmounts = secondSnapshot.val() as string;

                const matches = electricAmounts.match(/\d+\.\d+(?=\s*Ws)/g);

                if (matches) {
                  const [electricAmount1, electricAmount2, electricAmount3] =
                    matches.map(parseFloat);
                  chartData.push({
                    timestamp,
                    electricAmount1,
                    electricAmount2,
                    electricAmount3,
                  });
                }
              });
            });
          });

          chartData.sort((a, b) => {
            const [aHour, aMinute, aSecond] = a.timestamp.split(":");
            const [bHour, bMinute, bSecond] = b.timestamp.split(":");
            return (
              parseInt(aHour) * 3600 +
              parseInt(aMinute) * 60 +
              parseInt(aSecond) -
              (parseInt(bHour) * 3600 +
                parseInt(bMinute) * 60 +
                parseInt(bSecond))
            );
          });

          setData(chartData);
        }
      });
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [databaseRef]);

  return (
    <div id="dashboard">
      <Menu />
      <div className="dashboard__function">
        <div className="dashboard__filter">
          <div style={{ backgroundColor: "white", padding: "24px" }}>
            <LineChart
              width={800}
              height={400}
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="timestamp" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="electricAmount1"
                stroke="#8884d8"
              />
              <Line
                type="monotone"
                dataKey="electricAmount2"
                stroke="#82ca9d"
              />
              <Line
                type="monotone"
                dataKey="electricAmount3"
                stroke="#ffc658"
              />
            </LineChart>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartComponent;
