export const todayISO = () =>
  `${new Date(Date.now()).toISOString().split("T")[0]}T00:00:00Z`;
