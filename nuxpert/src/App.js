import React, { Component } from 'react';
import {BrowserRouter as Router, Route} from 'react-router-dom';
import './App.css';
import Home from './pages/Home.jsx'
import Result from './pages/Result';
import Test from './pages/Test.jsx'
import TestMouseTracing from './pages/TestMouseTracing.jsx'
import Credit from './pages/Credit.jsx'
import Search from './pages/Search';

class App extends Component {
  render() {
    return (
      <Router>
        <div>
          <Route exact path="/" component = {Home}/>
          <Route exact path="/result" component = {Result}/>
          <Route exact path="/test" component = {Test}/>
          <Route exact path="/tmt" component = {TestMouseTracing}/>
          <Route exact path="/credit" component = {Credit}/>
          <Route exact path="/search" component = {Search}/>
        </div>
      </Router>
    );
  }
}

export default App;
