module.exports = function(RED) {
    function DumbApplianceNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.appliance = new dumbAppliance({
            name: config.name,
            bufsize: config.bufsize,
            threshold: config.threshold,
            callback: function(name, state) {
                node.send({payload: {name: name, state: state}});
            },
            offToOnThreshold : config.offToOnThreshold,
            doneToOnThreshold: config.doneToOnThreshold
        });


        node.on('input', function(msg) {
            if(msg.payload["watt"]) {
                node.appliance.update(msg.payload["watt"]);
            }
        });

    }

    RED.nodes.registerType("dumb-appliance", DumbApplianceNode);
};


var dumbAppliance = function(options) {
    var self = this;

    this.name = options.name;
    this.bufsize = options.bufsize;
    this.threshold = options.threshold;
    this.callback = options.callback ? options.callback : function(){};
    this.offToOnThreshold = options.offToOnThreshold ? options.offToOnThreshold : 0;
    this.doneToOnThreshold = options.doneToOnThreshold ? options.doneToOnThreshold : 0;

    this.buf = new Array(this.bufsize);
    for (var i = this.buf.length-1; i >= 0; -- i) {
        this.buf[i] = 0;
    }
    this.index = 0;
    this.update = function(value) {
        value = parseInt(value);
        self.buf[self.index] = value;
        self.index = (self.index+1)%self.bufsize;

        var total = 0;
        for(var i=0,n=self.buf.length; i<n; ++i)
        {
            total += self.buf[i];
        }

        self.state.update(total / self.bufsize);
    };
    this.states = {};
    this.states.off = function() {
        this.name = "off";
        this.update = function(value) {
            if (value > self.offToOnThreshold) {
                if (value == self.threshold) {
                    return self.state = new self.states.done();
                }
                return self.state = new self.states.on();
            }
        };
        self.callback(self.name, this.name);
    };
    this.states.on = function() {
        this.name = "on";
        this.update = function(value) {
            if (value == self.threshold) {
                return self.state = new self.states.done();
            }
            if (value == 0) {
                return self.state = new self.states.off();
            }
        };
        self.callback(self.name, this.name);
    };
    this.states.done = function() {
        this.name = "done";
        this.update = function(value) {
            if(value !== self.threshold) {
                if(value > self.doneToOnThreshold) {
                    return self.state = new self.states.on();
                }
                if(value == 0) {
                    return self.state = new self.states.off();
                }
            }
        };
        self.callback(self.name, this.name);
    };

    this.state = new this.states.off();
};