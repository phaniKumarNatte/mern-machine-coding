import { useState } from "react";
import { use } from "react";
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
import QRCode from "react-qr-code"
import QRCodeGenerator from 'qrcode';


function App() {

  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrImage, setQrImage] = useState("");

  const hanldeShorten = async() => {
    if(!url) return;
    try {
      const res = await axios.post(`{API_BASE_URL}/shorten`,{
        originalUrl:url        
      });

      const newShortUrl = Response.data.shortUrl;
      setShortUrl(newShortUrl);

      setCopied(false);

      const qr = await QRCodeGenerator.toDataURL(newShortUrl);
      setQrImage(qr);
    } catch(err) {
      console.log(err);
      alert("something went wront")
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    },2000)
  }

  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">URL SHORTENER</h1>
      <div className="flex flex-col gap-3 w-full max-w-3xl">
        <input type="text" name="" id="" className="input input-success w-full" placeholder="Enter long url" value={url}
        onChange={(e) => {
          setUrl(e.target.value)
        }}
        />
        <button className="btn btn-primary w-full">Shorten</button>

      </div>
      {shortUrl && (
        <div className="flex flex-col item-center">
          <p>your short link: </p>
          <a className="link link-primary break-all" href={shortUrl}></a>
          <button className="btn mt-2 w-full">
            {copied ? copied : "copy"}
          </button>

          <div className="bg-white p-4 rounded-lg shadow mt-6">
              <p>Scan Qr Code </p>
              <QRCode value={shortUrl} size={180}></QRCode>
          </div>
          {qrImage && (
            <a href={qrImage} ></a>
          )}
        </div>
      )}
    </div>
  )
}
export default App;