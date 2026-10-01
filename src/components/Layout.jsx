import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ title, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar title={title} />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
