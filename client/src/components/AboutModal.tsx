interface Props {
  onClose: () => void;
}

export default function AboutModal({ onClose }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>About</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body about-body">
          <p>
            This portfolio project vibecoded by <strong>Zack Burgess</strong> and <strong>Claude</strong>.
          </p>
          <p>
            Clone the repo:{" "}
            <a href="https://github.com/zack-burgess/groups-manager" target="_blank" rel="noopener noreferrer">
              github.com/zack-burgess/groups-manager
            </a>
          </p>
          <p>
            To learn more about the discovery and delivery process, visit{" "}
            <a href="https://zackburgess.co/case-study" target="_blank" rel="noopener noreferrer">
              zackburgess.co/case-study
            </a>
          </p>
          <hr className="about-divider" />
          <h3>Try Automated Membership</h3>
          <ol className="about-tutorial">
            <li>To configure Automated Membership, you must be an <strong>Admin</strong> for the group. You are automatically an Admin of the &#x2B50; A-Team and Recruiting, or you can create your own group.</li>
            <li>Open the group and <strong>Create Rule</strong> for Automated Membership.</li>
            <li>Create a <strong>New Employee</strong> from the &#x2699;&#xFE0E; gear icon in the top right.</li>
            <li>View the <strong>Group's Members</strong> to see they were added, based upon your Rule Filter.</li>
          </ol>
          <p className="about-contact">Questions? Email Zack at{" "}
            <a href="mailto:zack.burgess@hey.com">zack.burgess@hey.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
