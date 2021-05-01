# PROV4ITDaTa: ui

This is the user interface for [PROV4ITDaTa: web-app](https://github.com/RMLio/prov4itdata-web-app) and was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Development

### Available Scripts

In the project directory, you can run:

#### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3001](http://localhost:3001) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

#### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

#### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

### Tests

#### Option 1: Two foreground processes

Open two CLIs:

- CLI #1 for running the development server (without opening a browser): `yarn run start:nb`
- CLI #2 for running the tests (two options): 
  - Using Cypress Test Runner: `yarn run cypress:open`
  - Headless: `yarn run cypress:run-headless`

#### Option 2: Development server in the background

Start the development server and run the Cypress tests using the `test`-script.

> Note that this will run a development server in a background process.

```bash
yarn run test
```

Or do it manually using the following commands:

```bash
# Start the development server in the background
yarn run start:ci &
# Run Cypress tests
yarn run cypress:run --browser chrome --headless
```

### Troubleshooting

#### Port already in use

This might occur when there is already running a development server in the background. In that case, you might want to identify & that process.

You can identify which process is already using a particular port using `lsof`.
For example, the following command shows processes using port `3001`.

```bash
lsof -nP -i4TCP:3001
```

## License

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
