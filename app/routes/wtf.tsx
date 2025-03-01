import type { ReactNode } from "react";

const Th = ({ children }: { children: ReactNode }): ReactNode => {
  return <th className="p-1">{children}</th>;
};

const Td = ({ children }: { children: ReactNode }): ReactNode => {
  return <td className="p-1">{children}</td>;
};

export default function Ugh(): ReactNode {
  return (
    <div className="flex">
      <div className="bg-[grey] w-[200px] flex-grow-0 flex-shrink-0 border h-screen"></div>
      <main className="bg-amber-50 w-full overflow-scroll">
        <div className="m-4">
          <h1>asdfl;kfasdfkl</h1>
        </div>
        <div className="m-4">
          <div className="overflow-scroll">
            <table className="w-full bg-slate-200">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Address</Th>
                  <Th>City</Th>
                  <Th>State</Th>
                  <Th>Zip</Th>
                  <Th>Country</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>John Doe</Td>
                  <Td>john.doe@example.com</Td>
                  <Td>1234567890</Td>
                  <Td>123 Main St</Td>
                  <Td>Anytown</Td>
                  <Td>CA</Td>
                  <Td>12345</Td>
                  <Td>USA</Td>
                  <Td>Delete</Td>
                </tr>
                <tr>
                  <Td>Jane Smith</Td>
                  <Td>jane.smith@example.com</Td>
                  <Td>1234567890</Td>
                  <Td>456 Oak Ave</Td>
                  <Td>Othertown</Td>
                  <Td>NY</Td>
                  <Td>12345</Td>
                  <Td>USA</Td>
                  <Td>Delete</Td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
