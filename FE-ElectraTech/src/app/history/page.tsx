import "@/styles/dashboard.css";
import "@/styles/history.css";
import Menu from "@/components/menu";

export default function Recommend() {
  return (
    <>
      <div id="dashboard">
        <Menu />
        <div className="dashboard__function">
          <table>
            <tbody>
              <tr>
                <th>Device</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
              <tr>
                <td>Air Conditioner</td>
                <td>Turn on</td>
                <td>1h30</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
