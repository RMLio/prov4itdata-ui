export default function DownloadButton ({onClick, label = 'Download'}){
    return (
        <a href="#" onClick={onClick} className="download-link">{label}</a>
    );
}