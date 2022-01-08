if (document.readyState == 'complete') {
    MainScript();
} else {
    window.addEventListener("load", MainScript, false);
}

function addJS_Node(text, s_URL, funcToRun, runOnLoad) {
    var D = document;
    var scriptNode = D.createElement('script');
    if (runOnLoad) {
        scriptNode.addEventListener("load", runOnLoad, false);
    }
    scriptNode.type = "text/javascript";
    if (text) scriptNode.textContent = text;
    if (s_URL) scriptNode.src = s_URL;
    if (funcToRun) scriptNode.textContent = '(' + funcToRun.toString() + ')()';

    var targ = D.getElementsByTagName('head')[0] || D.body || D.documentElement;
    targ.appendChild(scriptNode);
}

localStorage.extensionID = chrome.runtime.id;

function MainScript() {
    function my_init() {
        console.clear();
        console.dir("CSM SmartSale Init");
        window.csmoneySmartSale = {
            init: function(config) {
                let self = this;
                self.sell_mode        = false;
                self.appID            = inventoriesList.user.appID;
                self.MILLISECONDS     = 1000;
                self.MINUTES          = 60;
                self.HOURS            = 60;
                self.DAYS             = 24;
                self.currentDate      = new Date();
                self.tomorrow         = new Date(self.currentDate.getTime() + self.DAYS * self.HOURS * self.MINUTES * self.MILLISECONDS);
                self.currentItems     = [];
                self.offerItemsList   = {};
                self.userInventory    = [];
                self.defaultCommision = 100 - dataSellInputs.percent * 100;
                self.maxCommision     = 25;
                self.currentCommision = null;
                self.extensionID      = localStorage.extensionID;
                self.onSale           = self.getSmartSale() || [];
                self.cleanOptions = {
                    startDate  : self.currentDate.getTime(),
                    endDate    : self.tomorrow.getTime(),
                    stepDate   : null,
                    stepTime   : null,
                    step       : 1,
                    steps      : 1,
                    stepPrice  : null,
                    startBefore: null,
                    endBefore  : null
                }
                self.loadInventory();
                setInterval(() => {
                    self.checkResalePrice();
                }, 1000);
            },
            sort: function(obj,valSelector) {
                let self = this;
                const sortedEntries = Object.entries(obj)
                    .sort((a, b) =>
                        valSelector(a[1]) > valSelector(b[1]) ? 1 :
                        valSelector(a[1]) < valSelector(b[1]) ? -1 : 0);
                return new Map(sortedEntries);
            },
            loadInventory: function(){
                let self = this;
                request.get("/730/load_user_inventory", function(err, res) {
                    if (err || !res) return;
                    self.userInventory = res;
                });
            },
            checkResalePrice: function() {
                let self = this;
                self.onSale = self.getSmartSale();
                if (self.onSale) {
                    let currentTime = new Date().getTime();
                    let sortedMap = self.sort(self.onSale, val => val.stepDate);
                    let sortedObj = {};
                    sortedMap.forEach((v,k) => { sortedObj[k] = v });

                    let id = Object.keys(sortedObj)[0];
                    let { endDate, step, stepDate, steps } = sortedObj[id];
                    console.dir(`time: ${currentTime}, stepTime: ${stepDate}, bool: ${currentTime >= stepDate}`);
                    if (currentTime >= stepDate && currentTime <= endDate && step <= steps) {
                        self.changePrice(id, options);
                    }
                }
            },
            changePrice: function(id, options){
                let self = this;
                let item = self.userInventory?.filter(elem => elem.id == id)?.[0];
                if (item) {
                    let new_price = item.cp - options.stepPrice;
                    request.post("/edit_price", {
                        "peopleItems":[{
                            "assetid": item.ai[0],
                            "local_price": item.p,
                            "price": item.p,
                            "hold_time": null,
                            "market_hash_name": skinsBaseList[self.appID][item.o].m,
                            "bot": item.bi[0],
                            "reality":"virtual",
                            "currency":"USD",
                            "username": username,
                            "appid": self.appID,
                            "name_id": item.o,
                            "float": item?.f[0],
                            "stickers_count": 0,
                            "custom_price": new_price,
                            "commission": 5
                        }],
                        "botItems":[],
                        "onWallet":new_price
                    }, function(err, res) {
                        if (err || !res) {
                            return;
                        }
                        if (res.success) {
                            options.step++;
                            options.stepDate = self.getNextStepTime(options.startDate, endDate.endDate, options.step, options.steps);
                            self.updateSmartSale(id, options);
                        }
                    });
                }
            },
            changeStep: function() {
                let self = this;
                steps.value = Math.floor((+$(".market_price_input").val() - +endBefore.value) / +stepPrice.value);
            },
            changeStepPrice: function() {
                let self = this;
                stepPrice.value = +((+$(".market_price_input").val() - +endBefore.value) / +steps.value).toFixed(2);
            },
            getDaysDiff: function(start, end){
                let self = this;
                return Math.abs(new Date(end) - new Date(start));
            },
            transformToISO: function(date){
                let self = this;
                return new Date(date).toISOString().slice(0, 10);
            },
            changeDaysDiff: function() {
                let self = this;
                if (startDate.value && endDate.value) {
                    let diff = self.getDaysDiff(startDate.value, endDate.value),
                        seconds  = diff / self.MILLISECONDS,
                        minutes  = seconds / self.MINUTES,
                        hours    = minutes / self.HOURS,
                        daysDiff = hours / self.DAYS;
                    steps.value = daysDiff;
                    self.changeStepPrice();
                }
            },
            // TODO: fix reverse commission
            getCommision: function(){
                let self = this;
                self.updateCurrentItems();
                for (let currentItem of self.currentItems){
                    let Commision = +((endBefore.value - currentItem.params.p / 0.95) / endBefore.value * 100 / 2).toFixed(2);
                    self.currentCommision = self.defaultCommision;
                    if (currentItem.params?.pop && Commision > self.defaultCommision) {
                        self.currentCommision = Commision > self.maxCommision ? self.maxCommision : Commision;
                    }
                }
                return self.currentCommision;
            },
            getPercent: function(from) {
                let self = this;
                return +(from.value * 100 / (100 - self.getCommision())).toFixed(2);
            },
            getBackPercent: function(from) {
                let self = this;
                return +(from.value / 100 * (100 - self.getCommision())).toFixed(2);
            },
            updateMenuValue: function(){
                let self = this;
                let { startDate, endDate, startBefore, endBefore, steps, stepPrice } = self.selectedItem;
                document.querySelector("#startDate").value   = self.transformToISO(startDate || self.currentDate);
                document.querySelector("#endDate").value     = self.transformToISO(endDate || self.tomorrow);
                document.querySelector("#startBefore").value = startBefore;
                document.querySelector("#endBefore").value   = endBefore;
                document.querySelector("#steps").value       = steps;
                document.querySelector("#stepPrice").value   = stepPrice;
            },
            updateCurrentItems: function() {
                let self = this;
                self.currentItems = MODE.selectedItems;
            },
            updateCurrentItemsId: function(){
                let self = this;
                self.updateCurrentItems();
                self.selectedItemsId = [].concat(...self.currentItems.map(v => v.params.id));
            },
            updateOfferMenu: function(option){
                let self = this;
                for (let selectedItemId of self.selectedItemsId){
                    if (option === 'add') {
                        self.offerItemsList[selectedItemId] = self.getCurrentInputs();
                    } else {
                        delete self.offerItemsList[selectedItemId];
                    }
                }
                self.updateCurrentItemsId();
                self.updateInputs(self.cleanOptions);
            },
            getNextStepTime: function(startDate, endDate, currentStep, steps){
                let self = this;
                return Math.round((self.getDaysDiff(startDate, endDate) * currentStep) / steps);
            },
            getCurrentInputs: function(){
                let self = this;
                return {
                    startDate  : new Date(startDate.value).getTime(),
                    endDate    : new Date(endDate.value).getTime(),
                    stepDate   : new Date(new Date(startDate.value).getTime() + self.getDaysDiff(startDate.value, endDate.value) / +steps.value).getTime(),
                    stepTime   : self.getNextStepTime(startDate.value, endDate.value, 1, +steps.value),
                    step       : 1,
                    steps      : Number(steps.value),
                    stepPrice  : Number(stepPrice.value),
                    startBefore: Number(startBefore.value),
                    endBefore  : Number(endBefore.value),
                }
            },
            updateInputs: function(options){
                let self = this;
                self.updateCurrentItemsId();
                self.selectedItem = options || self.getCurrentInputs();
                self.updateMenuValue();
            },
            doFakeClick: function(element){
                let dispatchMouseEvent = function(target, var_args) {
                    let e = document.createEvent("MouseEvents");
                    e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
                    target.dispatchEvent(e);
                };
                dispatchMouseEvent(element, 'mouseover', true, true);
                dispatchMouseEvent(element, 'mousedown', true, true);
                dispatchMouseEvent(element, 'click', true, true);
                dispatchMouseEvent(element, 'mouseup', true, true);
            },
            buildMenu: function(){
                let self = this;
                let market_days_container = document.createElement("div");
                market_days_container.className = "SmartSale";
                market_days_container.innerHTML = `
                <div class="market_days_inputs superclass_space">
                    <div>
                        <div class="market_days_input_container market_days_input_container_start">
                            <input class="market_days_input" id="startDate" type="date" value="${self.transformToISO(self.currentDate)}">
                        </div>
                        <div class="market_price_text">start</div>
                    </div>
                    <div>
                        <div class="market_days_input_container market_days_input_container_end">
                            <input class="market_days_input" id="endDate" type="date" value="${self.transformToISO(self.tomorrow)}">
                        </div>
                        <div class="market_price_text">end</div>
                    </div>
                </div>
                <div class="market_price-before_inputs superclass_space">
                    <div>
                        <div class="market_price-before_input_container market_price-before_input_container_get">
                            <span class="currency_symbol">$</span>
                            <input class="market_price-before_input" id="startBefore" name="" placeholder="0.00">
                        </div>
                        <div class="market_price_text">get</div>
                    </div>
                    <div>
                        <div class="market_price-before_input_container market_price-before_input_container_sell">
                            <span class="currency_symbol">$</span>
                            <input class="market_price-before_input" id="endBefore" name="" placeholder="0.00">
                        </div>
                        <div class="market_price_text">sell</div>
                    </div>
                </div>
                <div class="market_step_inputs superclass_space">
                    <div>
                        <div class="market_step_input_container market_step_input_container_get">
                            <input class="market_step_input" id="steps" name="" placeholder="0">
                        </div>
                        <div class="market_price_text">steps count</div>
                    </div>
                    <div>
                        <div class="market_step_input_container market_step_input_container_sell">
                            <span class="currency_symbol">$</span>
                            <input class="market_step-price_input" id="stepPrice" name="" placeholder="0.00">
                        </div>
                        <div class="market_price_text">steps cost</div>
                    </div>
                </div>`;
                $(".market_price")[0].appendChild(market_days_container);
                self.changeDaysDiff();
                self.buildMenuEvents();
            },
            destroyMenu: function(){
                let self = this;
                $(".SmartSale").remove();
            },
            buildMenuEvents: function(){
                let self = this;
                $(".market_price input").on("keyup", (e) => {
                    let { id } = e.target;
                    switch (id) {
                        case "startBefore":
                            endBefore.value = self.getPercent(startBefore);
                            break;
                        case "endBefore":
                            startBefore.value = self.getBackPercent(endBefore);
                            break;
                        case "stepPrice":
                            self.changeStep();
                            break;
                        default:
                            break;
                    }
                    if (id !== "stepPrice") self.changeStepPrice();
                    self.updateInputs();
                });
                $(".SmartSale input").on("keydown", (e) => !(e.key.length == 1 && e.key.match(/[^0-9'".]/)));
                $(".SmartSale [type='date']").on("change", function(){
                    self.changeDaysDiff();
                    self.updateInputs();
                });
                $(".items").on("click", ".item", (e) => {
                    self.currentContainer = e.target.closest('.items').parentElement.id;
                    if (self.currentContainer.includes('offer')) {
                        self.updateCurrentItemsId();
                        self.updateInputs(self.offerItemsList[self.selectedItemsId[0]]);
                    } else {
                        self.updateInputs(self.cleanOptions);
                    }

                    let market_price_input = document.querySelector(".market_price_input");
                    market_price_input.addEventListener("keyup", function(event) {
                        if (event.keyCode === 13) {
                            event.preventDefault();
                            self.doFakeClick(MODE.addCancelSellModeButton);
                        }
                    });
                    market_price_input.select();
                });
                $('.button_add_sell_list').on('click', function(e) {
                    self.updateOfferMenu(self.currentContainer.includes('offer') ? 'delete' : 'add');
                });
            },
            setSmartSale: function(){
                let self = this;
                localStorage.SmartSale = JSON.stringify({ ...self.getSmartSale(), ...self.offerItemsList });
                self.offerItemsList = {};
            },
            updateSmartSale: function(id, options){
                let self = this;
                self.onSale = self.getSmartSale();
                self.onSale[id] = options;
                localStorage.SmartSale = JSON.stringify(self.onSale);
            },
            getSmartSale: function(){
                return JSON.parse(localStorage.getItem("SmartSale"));
            }
        }
        csmoneySmartSale.init();

        sell_mode_call.setTap(function() {
            csmoneySmartSale.sell_mode = !csmoneySmartSale.sell_mode;
            if(csmoneySmartSale.sell_mode){
                csmoneySmartSale.buildMenu();
            } else {
                csmoneySmartSale.destroyMenu();
            }
        });

        XMLHttpRequest.prototype.realSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(value) {
            this.addEventListener("load", function(){
                let self = this;
                if (self.responseURL === "https://old.cs.money/sell_skins") {
                    let result = JSON.parse(self.responseText);
                    console.dir(result);
                    if (result.success) {
                        csmoneySmartSale.setSmartSale();
                    } else {
                        console.dir("Error add to SALE!");
                    }
                }
            }, false);
            this.realSend(value);
        }
    }
    addJS_Node(my_init);
    addJS_Node("my_init();");
}
