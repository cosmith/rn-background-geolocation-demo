'use strict';

var React = require('react-native');
var {
  StyleSheet,
  Text,
  View,
  ToolbarAndroid,
  SwitchAndroid
} = React;

var RNGMap                = require('react-native-gmaps');
var Polyline              = require('react-native-gmaps/Polyline');

var BackgroundGeolocation = require('react-native-background-geolocation-android');
var Icon                  = require('react-native-vector-icons/Ionicons');
var SettingsService       = require('./SettingsService');

SettingsService.init('Android');

var Home = React.createClass({
  locationIcon: 'green-circle.png',
  currentLocation: undefined,

  getInitialState: function() {
    return {
      enabled: false,
      isMoving: false,
      paceButtonStyle: commonStyles.disabledButton,
      paceButtonIcon: 'play',
      navigateButtonIcon: 'navigate',
      mapHeight: 300,
      mapWidth: 300,
      // mapbox
      center: {
        lat: 40.7223,
        lng: -73.9878
      },
      zoom: 10,
      markers: []
    };
  },
  
  componentDidMount: function() {
    var me = this,
        gmap = this.refs.gmap;

    // location event
    BackgroundGeolocation.on("location", function(location) {
      console.log('- location: ', JSON.stringify(location));
      
      me.setCenter(location);

      gmap.addMarker(me._createMarker(location));

      // Add a point to our tracking polyline
      if (me.polyline) {
        me.polyline.addPoint(location.coords.latitude, location.coords.longitude);
      }
    });
    // http event
    BackgroundGeolocation.on("http", function(response) {
      console.log('- http ' + response.status);
      console.log(response.responseText);
    });
    // geofence event
    BackgroundGeolocation.on("geofence", function(geofence) {
      console.log('- onGeofence: ', JSON.stringify(geofence));
    });
    // error event
    BackgroundGeolocation.on("error", function(error) {
      console.log('- ERROR: ', JSON.stringify(error));
    });
    // motionchange event
    BackgroundGeolocation.on("motionchange", function(event) {
      console.log("- motionchange", JSON.stringify(event));
      me.updatePaceButtonStyle()
    });

    // getGeofences
    BackgroundGeolocation.getGeofences(function(rs) {
      console.log('- getGeofences: ', JSON.stringify(rs));
    }, function(error) {
      console.log("- getGeofences ERROR", error);
    });

    SettingsService.getValues(function(values) {
      values.license = "eddbe81bbd86fa030ea466198e778ac78229454c31100295dae4bfc5c4d0f7e2";
      values.orderId = 1;
      values.stopTimeout = 0;
      values.maxBatchSize = 2;
      values.params = {
        device: {
          uuid: 'TODO',
          model: 'TODO'
        }
      };
      
      BackgroundGeolocation.configure(values, function(state) {
        console.log('- configure state: ', state);
        me.setState({
          enabled: state.enabled
        });
        if (state.enabled) {
          me.initializePolyline();
          me.updatePaceButtonStyle()
        }
      });
    });

    this.setState({
      enabled: false,
      isMoving: false
    });
  },
  _createMarker: function(location) {
    return {
        title: location.timestamp,
        icon: this.locationIcon,
        anchor: [0.5, 0.5],
        coordinates: {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        }
      };
  },
  initializePolyline: function() {
    // Create our tracking Polyline
    var me = this;
    Polyline.create({
      points: [],
      geodesic: true,
      color: '#2677FF',
      width: 12
    }, function(polyline) {
      me.polyline = polyline;
    });
  },

  onClickMenu: function() {
    this.props.drawer.open();
  },

  onClickEnable: function() {    
    var me = this;
    if (!this.state.enabled) {
      BackgroundGeolocation.start(function() {
        me.initializePolyline();
      });
    } else {
      BackgroundGeolocation.stop();
      this.setState({
        markers: [{}]
      });
      this.setState({
        markers: []
      });
      if (this.polyline) {
        this.polyline.remove(function(result) {
          me.polyline = undefined;
        });
      }
    }

    this.setState({
      enabled: !this.state.enabled
    });
    this.updatePaceButtonStyle();
  },
  onClickPace: function() {
    if (!this.state.enabled) { return; }
    var isMoving = !this.state.isMoving;
    BackgroundGeolocation.changePace(isMoving);

    this.setState({
      isMoving: isMoving
    });      
    this.updatePaceButtonStyle();
  },
  onClickLocate: function() {
    var me = this;

    BackgroundGeolocation.getCurrentPosition({timeout: 30}, function(location) {
      me.setCenter(location);
      console.log('- current position: ', JSON.stringify(location));      
    }, function(error) {
      console.error('ERROR: getCurrentPosition', error);
      me.setState({navigateButtonIcon: 'navigate'});
    });
  },
  onRegionChange: function() {
    console.log('onRegionChange');
  },
  setCenter: function(location) {
    this.setState({
      navigateButtonIcon: 'navigate',
      center: {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      },
      zoom: 16
    });
  },
  onLayout: function() {
    var me = this,
        gmap = this.refs.gmap;

    this.refs.workspace.measure(function(ox, oy, width, height, px, py) {
      me.setState({
        mapHeight: height,
        mapWidth: width
      });
    });
  },
  updatePaceButtonStyle: function() {
    var style = commonStyles.disabledButton;
    if (this.state.enabled) {
      style = (this.state.isMoving) ? commonStyles.redButton : commonStyles.greenButton;
    }
    this.setState({
      paceButtonStyle: style,
      paceButtonIcon: (this.state.enabled && this.state.isMoving) ? 'pause' : 'play'
    });
  },
  render: function() {
    return (
      <View style={commonStyles.container}>
        <View style={commonStyles.topToolbar}>
          <Icon.Button name="android-options" onPress={this.onClickMenu} backgroundColor="transparent" size={30} color="#000" style={styles.btnMenu} underlayColor={"transparent"} />
          <Text style={commonStyles.toolbarTitle}>Background Geolocation</Text>
          <SwitchAndroid onValueChange={this.onClickEnable} value={this.state.enabled} />
        </View>
        <View ref="workspace" style={styles.workspace} onLayout={this.onLayout}>
          <RNGMap
            ref={'gmap'}
            style={{width: this.state.mapWidth, height: this.state.mapHeight}}
            markers={this.state.markers}
            zoomLevel={this.state.zoom}
            onMapChange={(e) => console.log(e)}
            onMapError={(e) => console.log('Map error --> ', e)}
            center={this.state.center} />

        </View>
        <View style={commonStyles.bottomToolbar}>
          <Icon.Button name={this.state.navigateButtonIcon} onPress={this.onClickLocate} size={25} color="#000" underlayColor="#ccc" backgroundColor="transparent" style={styles.btnNavigate} />
          <Text style={{fontWeight: 'bold', fontSize: 18, flex: 1, textAlign: 'center'}}></Text>
          <Icon.Button name={this.state.paceButtonIcon} onPress={this.onClickPace} iconStyle={commonStyles.iconButton} style={this.state.paceButtonStyle}><Text>State</Text></Icon.Button>
          <Text>&nbsp;</Text>
        </View>
      </View>
    );
  }
});

var toolbarActions = [];

var commonStyles = require('./Styles.common');

var styles = StyleSheet.create({
  workspace: {
    flex: 1
  }
});

module.exports = Home;
