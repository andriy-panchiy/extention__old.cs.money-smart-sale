"use strict";

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
  function init() {
    console.dir("CSM SmartSale Init");
    var CSMSS = {
      init: function init(config) {
        var self = this;
        self.sell_mode = false;
        self.MILLISECONDS = 1000;
        self.MINUTES = 60;
        self.HOURS = 60;
        self.DAYS = 24;
        self.currentDate = new Date();
        self.tomorrow = new Date(new Date().getTime() + self.DAYS * self.HOURS * self.MINUTES * self.MILLISECONDS);
        self.currentDateISO = self.currentDate.toISOString().slice(0, 10);
        self.tomorrowISO = self.tomorrow.toISOString().slice(0, 10);
        self.currentItems = [];
        self.currentItem = null;
        self.extensionID = localStorage.extensionID;
      },
      changeStep: function changeStep() {
        var self = this;
        step.value = Math.floor((+$(".market_price_input").val() - +endBefore.value) / +stepPrice.value);
      },
      changeStepPrice: function changeStepPrice() {
        var self = this;
        stepPrice.value = ((+$(".market_price_input").val() - +endBefore.value) / +step.value).toFixed(2);
      },
      changeDaysDiff: function changeDaysDiff() {
        var self = this;

        if (startDate.value && endDate.value) {
          var a = new Date(startDate.value),
              b = new Date(endDate.value),
              diff = b - a,
              seconds = diff / self.MILLISECONDS,
              minutes = seconds / self.MINUTES,
              hours = minutes / self.HOURS,
              days = hours / self.DAYS;
          step.value = days;
          self.changeStepPrice();
        }
      },
      getCurrentItems: function getCurrentItems() {
        var self = this;
        self.currentItems = MODE.selectedItems;
        return self.currentItems;
      },
      getCurrentItem: function getCurrentItem() {
        var self = this;
        self.currentItem = self.getCurrentItems()[0];
        return self.currentItem;
      },
      getCommision: function getCommision() {
        var self = this;
        self.commision = self.currentItem.params;
        return 100 - +document.querySelector(".price_number span").innerText;
      },
      getPercent: function getPercent(from) {
        var self = this;
        return (+from.value * 100 / self.getCommision()).toFixed(2);
      },
      getBackPercent: function getBackPercent(from) {
        var self = this;
        return (+from.value / 100 * self.getCommision()).toFixed(2);
      },
      fake_click: function fake_click(element) {
        var dispatchMouseEvent = function dispatchMouseEvent(target, var_args) {
          var e = document.createEvent("MouseEvents");
          e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
          target.dispatchEvent(e);
        };

        dispatchMouseEvent(element, 'mouseover', true, true);
        dispatchMouseEvent(element, 'mousedown', true, true);
        dispatchMouseEvent(element, 'click', true, true);
        dispatchMouseEvent(element, 'mouseup', true, true);
      },
      cleanPriceInput: function cleanPriceInput() {
        var self = this;
        $(".items .item").on("click", function (e) {
          var market_price_input = document.getElementsByClassName("market_price_input")[0],
              button_add_sell_list = document.getElementsByClassName("button_add_sell_list")[1];
          market_price_input.value = "";
          market_price_input.addEventListener("keyup", function (event) {
            if (event.keyCode === 13) {
              event.preventDefault();
              self.fake_click(button_add_sell_list);
            }
          });
          market_price_input.addEventListener("focusout", function (event) {
            document.getElementsByClassName("market_price_error")[0].classList.add("hidden");
          });
        });
      },
      buildMenu: function buildMenu() {
        var self = this;
        var market_days_container = document.createElement("div");
        market_days_container.className = "CSMSS_appended";
        market_days_container.innerHTML = "\n                <div class=\"market_days_inputs superclass_space\">\n                    <div>\n                        <div class=\"market_days_input_container market_days_input_container_start\">\n                            <input class=\"market_days_input\" id=\"startDate\" type=\"date\" value=\"".concat(self.currentDateISO, "\">\n                        </div>\n                        <div class=\"market_price_text\">start</div>\n                    </div>\n                    <div>\n                        <div class=\"market_days_input_container market_days_input_container_end\">\n                            <input class=\"market_days_input\" id=\"endDate\" type=\"date\" value=\"").concat(self.tomorrowISO, "\">\n                        </div>\n                        <div class=\"market_price_text\">end</div>\n                    </div>\n                </div>\n                <div class=\"market_price-before_inputs superclass_space\">\n                    <div>\n                        <div class=\"market_price-before_input_container market_price-before_input_container_get\">\n                            <span class=\"currency_symbol\">$</span>\n                            <input class=\"market_price-before_input\" id=\"startBefore\" name=\"\" placeholder=\"0.00\">\n                        </div>\n                        <div class=\"market_price_text\">get</div>\n                    </div>\n                    <div>\n                        <div class=\"market_price-before_input_container market_price-before_input_container_sell\">\n                            <span class=\"currency_symbol\">$</span>\n                            <input class=\"market_price-before_input\" id=\"endBefore\" name=\"\" placeholder=\"0.00\">\n                        </div>\n                        <div class=\"market_price_text\">sell</div>\n                    </div>\n                </div>\n                <div class=\"market_step_inputs superclass_space\">\n                    <div>\n                        <div class=\"market_step_input_container market_step_input_container_get\">\n                            <input class=\"market_step_input\" id=\"step\" name=\"\" placeholder=\"0\">\n                        </div>\n                        <div class=\"market_price_text\">steps count</div>\n                    </div>\n                    <div>\n                        <div class=\"market_step_input_container market_step_input_container_sell\">\n                            <span class=\"currency_symbol\">$</span>\n                            <input class=\"market_step-price_input\" id=\"stepPrice\" name=\"\" placeholder=\"0.00\">\n                        </div>\n                        <div class=\"market_price_text\">steps cost</div>\n                    </div>\n                </div>");
        $(".market_price")[0].appendChild(market_days_container);
        self.changeDaysDiff();
        $(".market_price input").on("keyup", function (e) {
          var id = e.target.id;

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
        }).on("keydown", function (e) {
          return !(e.key.length == 1 && e.key.match(/[^0-9'".]/));
        });
        $(".market_price [type='date']").on("change", function (e) {
          self.changeDaysDiff();
        });
        $(".item").on("click", function () {
          self.cleanMenu();
        });
      },
      destroyMenu: function destroyMenu() {
        var self = this;
        $(".CSMSS_appended").remove();
      },
      cleanMenu: function cleanMenu() {
        var self = this;

        if (self.sell_mode) {
          startBefore.value = null;
          endBefore.value = null;
          stepPrice.value = null;
          startDate.value = self.currentDateISO;
          endDate.value = self.tomorrowISO;
          self.changeDaysDiff();
        }
      },
      pendingToSale: function pendingToSale() {},
      addToSale: function addToSale() {}
    };
    CSMSS.init();
    sell_mode_call.setTap(function () {
      CSMSS.sell_mode = !CSMSS.sell_mode;

      if (CSMSS.sell_mode) {
        CSMSS.buildMenu();
        CSMSS.cleanPriceInput();
      } else {
        CSMSS.destroyMenu();
      }
    }); // MODE.addCancelSellModeButton.setTap(function() {
    //     CSMSS.pendingToSale(MODE.selectedItems);
    // });
    // tradeButton.dom.setTap(function() {
    //     CSMSS.addToSale(inventoriesList.user.containers.offer.itemsList);
    // });
  }

  addJS_Node(init);
  addJS_Node("init();");
}