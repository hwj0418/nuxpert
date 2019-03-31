import React, { Component } from 'react'
import axios from 'axios'
export class SeachImage extends Component {

    // When the seach image component is called, construct the state object 
    // to record the user input image and the result for this image from the backend.
    constructor(props) {
        console.log("home page got props:", props);
        super(props);
        this.state = {
            image: 'image',
            result: {}
        }
    }

    // This function is called when user select an image to upload.
    onFileSelect(e) {
        // update state when user selected an image to upload.
        this.setState({
            image: e.target.files[0]
        })
    }

    // this function is called when user press the 'see report' button
    fileUploadHandler = () => {
        // wrap the image as form data inorder to send to the backend.
        let fd = new FormData();
        fd.append('image', this.state.image);
        axios.defaults.withCredentials = true;
        // use axios to send the post request
        axios.post("/api/search/image/", fd)
            // upon request is success sent
            .then(res => {
                // update result in the state.
                this.setState({
                    result: res.data
                });
                // and set up redirect location.
                const location = {
                    pathname: '/result',
                    state: this.state
                }
                // redirect to result page
                this.props.history.push(location);
            }).then(err => {
                console.log(err);
            });
    }

    render() {
        return (
            <div>
                {/* use input form for the image upload */}
                <input
                    type="file"
                    name="file"
                    onChange={(e) => this.onFileSelect(e)}
                    encType="multipart/form-data"
                />
                {/* button for file upload and redirection */}
                <button onClick={this.fileUploadHandler}>See Report</button>
                <br></br>
                <br></br>
            </div>
        )
    }
}

export default SeachImage
