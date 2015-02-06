package client

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	hawk "github.com/tent/hawk-go"
	"net/http"
)

type HttpMethod int

//go:generate generatemodel -f ../model/apis.json -o generated-code.go -m model-data.txt

type (
	Auth struct {
		// Client ID required by Hawk
		ClientId string
		// Access Token required by Hawk
		AccessToken string
		// By default set to production base url for API service, but can be changed to hit a
		// different service, e.g. a staging API endpoint, or a taskcluster-proxy endpoint
		BaseURL string
		// Whether authentication is enabled (e.g. set to 'false' when using taskcluster-proxy)
		Authenticate bool
	}
)

func (auth *Auth) apiCall(payload interface{}, method, route string, result interface{}) interface{} {
	credentials := &hawk.Credentials{
		ID:   auth.ClientId,
		Key:  auth.AccessToken,
		Hash: sha256.New,
	}
	httpRequest, err := http.NewRequest("GET", fmt.Sprintf("https://auth.taskcluster.net/v1/client/%v/scopes", auth.ClientId), nil)
	if err != nil {
		panic(err)
	}
	reqAuth := hawk.NewRequestAuth(httpRequest, credentials, 0).RequestHeader()
	httpRequest.Header.Set("Authorization", reqAuth)
	httpClient := &http.Client{}
	response, err := httpClient.Do(httpRequest)
	if err != nil {
		panic(err)
	}
	defer response.Body.Close()
	var scopes interface{}
	json := json.NewDecoder(response.Body)
	err = json.Decode(&scopes)
	if err != nil {
		panic(err)
	}
	return scopes
}
