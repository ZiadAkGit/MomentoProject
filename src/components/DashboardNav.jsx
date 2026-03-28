function DashboardNav({ links }) {
  return (
    <nav className="dashboard-nav" aria-label="Dashboard sections">
      {links.map((item) => (
        <a key={item.id} className="nav-chip" href={`#${item.id}`}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export default DashboardNav;
