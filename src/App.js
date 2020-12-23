import './App.css';
import MappingSelector from "./components/mapping-selector";

function App() {
    const mappingFileOptions = [
            {value: "A" , filename:"transfer-flickr-collections.ttl", label:"Transfer Flickr Collections"},
            {value : "B", filename:"transfer-imgur-images.ttl", label:"Transfer Imgur Images"},
            {value : "C", filename:"transfer-facebook-images.ttl", label:"Transfer Facebook Images"},
            {value : "D", filename:"transfer-instagram-images.ttl", label:"Transfer Instagram Images"}
        ]

    const handleMappingChanged = (e)=>{
        console.log("the mapping changed to " , e.target.value)
    }


  return (
    <div className="App">
      <MappingSelector
          options={mappingFileOptions}
          handleChange={handleMappingChanged}
      />
    </div>
  );
}

export default App;
