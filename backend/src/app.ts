import express from "express";
import cors from "cors";

import authRoute from "./modules/auth/auth.route";
import userRoute from "./modules/user/user.route";
import apartmentRoute from "./modules/apartment/apartment.route";
import floorRoute from "./modules/floor/floor.route";
import apartmentTypeRoute from "./modules/apartmentType/apartmentType.route";
import dashboardRoute from "./modules/dashboard/dashboard.route";
import serviceRoute from "./modules/service/service.route";
import residentRoute from "./modules/resident/resident.route";
import billRoute from "./modules/bill/bill.route";
import messageRoute from "./modules/message/message.route";
import vehicleRoute from "./modules/vehicle/vehicle.route";
import complaintRoute from "./modules/complaint/complaint.route";
import notificationRoute from "./modules/notification/notification.route";

import { errorHandler } from "./middleware/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/apartments", apartmentRoute);
app.use("/api/floors", floorRoute);
app.use("/api/apartment-types", apartmentTypeRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/services", serviceRoute);
app.use("/api/residents", residentRoute);
app.use("/api/bills", billRoute);
app.use("/api/vehicles", vehicleRoute);
app.use("/api/messages", messageRoute);
app.use("/api/complaints", complaintRoute);
app.use("/api/notifications", notificationRoute); 

app.get("/", (req, res) => {
  res.send("API running...");
});

app.use(errorHandler);

export default app;