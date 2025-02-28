import "@/styles/dashboard.css";
import "@/styles/member.css";
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
                <th>Name</th>
                <th>Action</th>
              </tr>
              <tr>
                <td>MathNumber</td>
                <td>
                  <button>Update</button>
                  <button>Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
