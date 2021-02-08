import './App.css';
import {useEffect, useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import Transfer from "./components/transfer";
import {Alert} from 'react-bootstrap';
import {
  handleProviderConnection,
  handleSolidLogin,
  handleSolidOperation,
  makeWarningAlert,
  readAndDecodeBody,
  createOptionRecordsFromMetaData,
  executeMappingOnBackend,
  makeAlert,
  STORAGE_KEYS,
  isProviderConnected,
  getConnectionUrlForProvider, extractProviderFromMappingUrl
} from "./lib/helpers";




function App() {

  let [mappingOptions, setMappingOptions] = useState()
  let [mapping, setMapping] = useState( {
    content : localStorage.getItem(STORAGE_KEYS.MAPPING_CONTENT) || '',
    value : localStorage.getItem(STORAGE_KEYS.MAPPING_URL)
  })

  let [generatedOutput, setGeneratedOutput] = useState("")
  let [provenance, setProvenance] = useState("")
  let [solidData, setSolidData] = useState("")
  let [alert, _setAlert] = useState()

  /**
   * Creates an alert.
   * @param a
   * @param alertDuration (optional) time in milliseconds that the alert message will be shown
   */
  const setAlert = (a, alertDuration = undefined) => {
    _setAlert(a)
    if(alertDuration)
      setTimeout(()=>_setAlert(""), alertDuration)
  }

  const updateMapping = (content, value) => {
    let provider = extractProviderFromMappingUrl(value);
    // Store in local storage
    localStorage.setItem(STORAGE_KEYS.MAPPING_URL, value);
    localStorage.setItem(STORAGE_KEYS.MAPPING_CONTENT, content)

    // Update mapping state
    setMapping({content, value, provider})
  }

  const clearMapping = () => updateMapping('',null)

  /**
   * Fetches mapping content & updates mapping state variable
   * @param url
   * @returns {Promise<void>}
   */
  const updateMappingFromUrl = async (url) => {
    fetch(url)
        .then(readAndDecodeBody)
        .then((data)=> updateMapping(data,url))
  }

  // Default mapping. this is the first option that will be rendered in the mapping selector)
  const defaultMapping = {'value' : 'default', 'label' : 'Select a mapping'}
  const updateMappings = (data) => {
    // keep the default option first
    setMappingOptions([defaultMapping, ...data])
  }

  // Fetch mappings-metadata using side-effects.
  // This side-effect will be executed only once.
  useEffect(() => {
    const fetchMappingsMetadata = async () => {
      const urlMetaData = "/rml/mappings-metadata.json";
      let mappingOptions = [];

      try {
        const response = await fetch(urlMetaData)

        if(response.status !== 200 )
          throw new Error('Error while getting the RML Mapping metadata...');

        const body = await readAndDecodeBody(response)
        const optionData = JSON.parse(body)
        mappingOptions = [...createOptionRecordsFromMetaData(optionData)]

      } catch (e) {
        console.log(e.message)
        const errMessage = e.message
        setAlert(makeWarningAlert(errMessage))

      } finally {
        updateMappings(mappingOptions)
      }
    }

    fetchMappingsMetadata();
  },[])


  /**
   * When triggered, the content of the selected mapping will be fetched and the state variable
   * mappingContent will be updated accordingly.
   * Note: the default mapping option does not refer to a mapping and will clear the mapping content.
   * @param {*} e : event triggered when the user selected a mapping from the MappingSelector.
   */
  const handleOnMappingChange = (e) => {

    if(e.target.value !== 'default') {
      // fetch contents and set the state variable mappingContent
      updateMappingFromUrl(e.target.value)
    } else
      // When selecting the default option (no mapping), clear the mapping.
      clearMapping()
  }

  /**
   * Checks with the backend whether the user is connected with the given provider (i.e. whether the user has already
   * authorized the app).
   * @param provider: data provider (e.g. flickr, imgur, ...)
   * @returns {Promise<void>}
   */
  const handleProviderConnection = async (provider) => {
    console.log('@handleProviderConnection')
    const providerIsConnected = await isProviderConnected(provider)

    // If provider is not connected, notify the user about it and redirect to the provider's authorization page
    if(!providerIsConnected) {
      console.log('provider is not connected --> redirecting!')
      let connectionUrl = await getConnectionUrlForProvider(provider)
      // Notify user
      setAlert(makeAlert('info', (<p>Required to authorize with provider.
        You will automatically be redirected to the authorization page.
        Otherwise, if the redirection is being blocked by your browser,
        you can authorize manually via <a href={connectionUrl}>this link.</a></p>)))

      // Redirect automatically after timeout
      await setTimeout(()=>{
        window.location.href = connectionUrl
      }, 2500)
    }
  }


  /**
   * Handler that calls the backend to execute the selected mapping.
   * Upon success, this will result in the generated output and provenance being set.
   * @param {*} e
   */
  const handleOnExecute = async (e)=> {
    console.log("@handleOnExecute")

    if(localStorage.getItem(STORAGE_KEYS.EXECUTION_ATTEMPTS)) {
      let count = parseInt(localStorage.getItem(STORAGE_KEYS.EXECUTION_ATTEMPTS));
      count++;
      localStorage.setItem(STORAGE_KEYS.EXECUTION_ATTEMPTS, count.toString());
    }else {
      localStorage.setItem(STORAGE_KEYS.EXECUTION_ATTEMPTS, '1');
    }

    if(mapping.value !== null) {
      // Extract provider & filename from e.target.value
      const [, provider, filename] = String(mapping.value).split('/')

      // Provider connection
      const providerIsConnected = await isProviderConnected(provider)
      if(!providerIsConnected)
        await handleProviderConnection(provider);
      else {
        // Solid connected?
        let session = await handleSolidLogin();

        if(session) {
          // onSuccess callback for execute mapping call
          const onSuccess = async (response) => {
            if(response.status === 200){
              try {
                const body = await readAndDecodeBody(response)
                const jsonData = JSON.parse(body)

                setGeneratedOutput(jsonData.rdf)
                setProvenance(jsonData.prov)

                // Store the generated RDF onto the user's Solid POD
                const solidRequestParams = {
                  method : 'PATCH',
                  body : `INSERT DATA {${jsonData.rdf}}`,
                  headers : {
                    'Content-Type': 'application/sparql-update'
                  }
                }

                await handleSolidOperation(solidRequestParams, (data)=>{
                  setAlert(makeAlert('info', 'Mapping executed successfully!'), 5000)
                  // Execution was successful so we can clean up the flags in the local storage
                  localStorage.removeItem(STORAGE_KEYS.EXECUTION_ATTEMPTS)
                }, (err)=>{
                  // Notify the user about any errors
                  setAlert(makeWarningAlert('Error while executing request to Solid pod. Message: ' + e))
                })

              }
              catch (e) {
                const errMsg = `Error while processing result from RMLMapper. \n Error message: ${e}`
                console.error(errMsg)
                setAlert(makeWarningAlert(errMsg))
              }

            } else {
              console.error(response)
              const errMessage = 'Something went wrong while executing the RML Mapping... ' +
                  '\n Response status code: ' + response.status;

              setAlert(makeWarningAlert(errMessage))
            }
          }

          // onError callback for execute mapping call
          const onError = (response) => {
            // TODO: handle onError
            console.error("request was unsuccessful: ", response)
          }

          // Call backend to execute the selected mapping
          await executeMappingOnBackend(provider, filename, onSuccess, onError)
        }
      }
    }else {
      setAlert(makeAlert('warning', (<p>You need to select a mapping first!</p>)))
    }
  }

  /**
   * Fetches data from Solid Pod.
   * If the user is not yet logged in to the Solid Pod, the login-popup will appear.
   *
   * @param e
   * @returns {Promise<void>}
   */
  const handleSolidFetch = async () => {
    await handleSolidOperation({method:'GET'},async (response)=>{
      const body = await readAndDecodeBody(response)
      setSolidData(body)
    }, (err)=>{
      // Notify the user about any errors
      setAlert(makeWarningAlert('Error while fetching data from Solid pod. Message: ' + err))
    })
  }

  /**
   * Clears the current file on the Solid Pod.
   * @returns {Promise<void>}
   */
  const handleSolidClear = async () => {
    await handleSolidOperation({
      solidFetchParams: {method:'DELETE'},
      onError: (err)=>{
        // Notify the user about any errors
        setAlert(makeWarningAlert('Error while clearing data on Solid pod. Message: ' + err))
      }})
    setSolidData('')
  }

  const handleDownload = (data) => {
    console.log("@handleDownload -- data: " , data)
  }

  const trackSession = async () => {
    console.log('@trackSession')
    const ls = localStorage;
    const sk = STORAGE_KEYS;

    if(ls.getItem(sk.EXECUTION_ATTEMPTS)) {
      // if execution was initiated, handle the execution
      const executionAttemptCount = parseInt(ls.getItem(sk.EXECUTION_ATTEMPTS))
      console.log('execution attempts: '  ,executionAttemptCount)
      const MAX_EXECUTION_ATTEMPTS = 3
      if(executionAttemptCount < MAX_EXECUTION_ATTEMPTS)
        await handleOnExecute()
      else {
        setAlert(makeWarningAlert('Maximum execution attempts exceeded...'))
        ls.removeItem(sk.EXECUTION_ATTEMPTS)
      }
    }
  }

  const renderedAlert = alert ? <Alert variant={alert.variant} data-test="alert-box">{alert.body}</Alert> : null;

  useEffect(()=>{
    trackSession()
  }, [mapping])

  return (
    <div className="App container">
      <h1>PROV4ITDaTa-DAPSI</h1>
      {renderedAlert}
      <Transfer
          mappings={mappingOptions}
          mappingContent={mapping.content}
          selectedOptionValue={mapping.value}
          generatedOutput={generatedOutput}
          provenance={provenance}
          solidData={solidData}
          handleOnExecute={handleOnExecute}
          handleOnMappingChange={handleOnMappingChange}
          handleSolidFetch={handleSolidFetch}
          handleSolidClear={handleSolidClear}
          handleDownload={handleDownload}
          data-cy="transfercomp"
      >
      </Transfer>
    </div>
  );
}

export default App;
