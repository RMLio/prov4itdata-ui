import './App.css';
import {useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import Transfer from "./components/transfer";
import { Alert } from 'react-bootstrap';


async function readAndDecodeBody(response) {
  // Set up a StreamReader and UTF8 decoder
  const reader = response.body.getReader()
  const utf8Decoder = new TextDecoder("utf-8")

  // Read, decode, repeat
  var { done, value } = await reader.read()
  var decodedData = utf8Decoder.decode(value)

  // Return decoded data
  return decodedData
}


/**
 * 
 * @param {*} metaData 
 */
function createOptionRecordsFromMetaData(mappingMeta) {
  // Get & flatten the values of the mappingMeta data (keys point to data providers, such as flickr, imgur, ...).
  // Then, add a 'value'-key to every mapping and set its value to the filename
  return Object.entries(mappingMeta).flatMap((entry)=>{
    let [k,records] = entry
    return records.map((r)=>{return {...r,value:`rml/${k}/${r.filename}`}})
  })
}


/**
 * Executes POST request to the backend for executing the RML Mapping referred to by urlMapping
 * @param {*} urlMapping : url of the RML Mapping
 */
async function executeMappingOnBackend(provider, filename, onSuccess = f => f, onError = f => f) {
  const url = `/rmlmapper/${provider}/${filename}`

  console.log("@executeMappingOnBackend. POST " , url)
  fetch(url, 
    {
      method : 'POST',
      mode : 'no-cors',
      headers: {
        'Content-Type' : 'text/turtle'
      }
    })
    .then(onSuccess)
    .catch(onError)
}

async function isProviderConnected(provider) {
  console.log("@isProviderConnected")
  const url = `/status/${provider}/connected`
  const response = await fetch(url, {
      method : 'GET',
  })

  if(response.ok){
    const body = await readAndDecodeBody(response)
    const status = JSON.parse(body) 
    return status.connected;
  }else {
    console.error("Error: response NOT OK: " , response)
    return false;
  }
}

async function getConnectionUrlForProvider(provider) {
  console.log("@getConnectionUrlForProvider -- provider: " , provider)
  const url = `/configuration/${provider}/connect`
  const response = await fetch(url, {
      method : 'GET',
  })

  if(response.ok){
    const connectData = await readAndDecodeBody(response)
    return JSON.parse(connectData).url;
  }else {
    console.error("Error: response NOT OK: " , response)
    return null;
  }
}



function makeAlert(variant, body) {
  return {variant, body}
}

function makeWarningAlert(body) {
  return makeAlert('warning', body)
}

function App() {
 
  let [mappingOptions, setMappingOptions] = useState()
  let [mapping, setMapping] = useState({content : '', value : null})
  let [mappingContent, setMappingContent] = useState("")
  let [generatedOutput, setGeneratedOutput] = useState("")
  let [provenance, setProvenance] = useState("")
  let [solidData, setSolidData] = useState("")
  let [alert, setAlert] = useState()

  const updateMapping = (content, value) => setMapping({content, value})
  const clearMapping = () => updateMapping('',null)

  const resetGeneratedOutput = () => setGeneratedOutput("")
  const resetProvenance = () => setProvenance("")

  // Default mapping. this is the first option that will be rendered in the mapping selector)
  const defaultMapping = {'value' : 'default', 'label' : 'Select a mapping'}
  const updateMappings = (data) => {
    // keep the default option first
    setMappingOptions([defaultMapping, ...data])
  }

  // If the mappingOptions aren't initialized yet, fetch & parse the mappings metadata, and
  // update the mappingOptions
  // 
  if(!mappingOptions) {
    const urlMetaData = "/rml/mappings-metadata.json";
    fetch(urlMetaData)
    .then(readAndDecodeBody)
    .then(JSON.parse)
    .then(createOptionRecordsFromMetaData)
    .then(updateMappings)
  }

  /**
   * When triggered, the content of the selected mapping will be fetched and the state variable
   * mappingContent will be updated accordingly.
   * Note: the default mapping option does not refer to a mapping and will clear the mapping content.
   * @param {*} e : event triggered when the user selected a mapping from the MappingSelector.
   */
  const handleOnMappingChange = (e) => {

    if(e.target.value !== 'default') {
      // fetch contents and set the state variable mappingContent
      const url = e.target.value
      fetch(url)
          .then(readAndDecodeBody)
          .then((data)=> {
            updateMapping(data,url)
          })
    } else
      // When selecting the default option (no mapping), clear the mapping.
      clearMapping()
  }


  /**
   * Handler that calls the backend to execute the selected mapping.
   * Upon success, this will result in the generated output and provenance being set.
   * @param {*} e 
   */
  const handleOnExecute = async (e)=> {
    // TODO: handle on execute event
    console.log("@handleOnExecute")


    if(mapping.value !== null) {
      // Extract provider & filename from e.target.value
      const [, provider, filename] = String(mapping.value).split('/')

      // connected?
      const providerIsConnected = await isProviderConnected(provider)
      if(providerIsConnected){
        console.log("provider is connected")

        // onSuccess callback for execute mapping call
        const onSuccess = async (response) => {
          if(response.status === 200){
            const body = await readAndDecodeBody(response)
            const jsonData = JSON.parse(body)
            setGeneratedOutput(jsonData.rdf)
            setProvenance(jsonData.prov)
          } else {
            // TODO: setAlert -- notify user that something went wrong
            console.error("response was not 200 ")
            console.error(response)
          }
        }

        // onError callback for execute mapping call
        const onError = (response) => {
          // TODO: handle onError
          console.error("request was unsuccessful: ", response)
          
        }

        // Call backend to execute the selected mapping
        executeMappingOnBackend(provider, filename, onSuccess, onError)

      }else {
        // provider is not connected
        console.log("provider isn't connected yet")
        let connectionUrl = await getConnectionUrlForProvider(provider)
        
        setAlert(makeAlert('info', (<p>Required to authorize with provider. Authorize via <a href={connectionUrl}>this link.</a></p>)))
      }
    }else {
      setAlert(makeAlert('warning', (<p>You need to select a mapping first!</p>)))
    }
  }

  const handleSolidFetch = (e) => {
      console.log("NotImplemented: handleSolidFetch")
  }

  const handleDownload = (data) => {
    console.log("@handleDownload -- data: " , data)
  }

  const renderedAlert = alert ? <Alert variant={alert.variant} data-test="alert-box">{alert.body}</Alert> : null;

  return (
    <div className="App container">
      <h1>PROV4ITDaTa-DAPSI</h1>
      {renderedAlert}
      <Transfer
          mappings={mappingOptions}
          mappingContent={mapping.content}
          generatedOutput={generatedOutput}
          provenance={provenance}
          solidData={solidData}
          handleOnExecute={handleOnExecute}
          handleOnMappingChange={handleOnMappingChange}
          handleSolidFetch={handleSolidFetch}
          handleDownload={handleDownload}
          data-cy="transfercomp"
      >
      </Transfer>
    </div>
  );
}

export default App;
