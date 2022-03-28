// Erbrechner by rafaelurben

///// Utils

function round(value, digits = 3) {
    return Math.round(value * (Math.pow(10, digits))) / Math.pow(10, digits);
}

function roundMoney(value) {
    return Math.round(value * 20) / 20
}

///// Calculation

class Person {
    // Static fields

    static everyoneById = {}
    static root = null;

    static highestid = 0;

    static free_quota_percent = 0;
    static free_quota_absolute = 0;

    // Static properties

    static get everyone() {
        return Object.values(Person.everyoneById)
    }

    /// Display

    static get displayFreeQuotaRelative() {
        var f = frac(Person.free_quota_percent, 999);
        return `Relativ: ${round(Person.free_quota_percent * 100)}% (${f[1]}/${f[2]})`;
    }

    static get displayFreeQuotaAbsolute() {
        return `Absolut: ${roundMoney(Person.free_quota_absolute)} CHF`;
    }

    // Static methods
    /// Distribution

    static resetDistribution() {
        Person.free_quota_percent = 0;
        Person.free_quota_absolute = 0;
        for (let person of Person.everyone) {
            person.share_percent = 0;
            person.share_absolute = 0;
            person.min_share_percent = 0;
            person.min_share_absolute = 0;
        }
    }

    static distribute(amount = 0) {
        Person.resetDistribution();

        // Distribution
        if (Person.root.partner && Person.root.partner.alive) {
            if (Person.root.isParental1Alive) {
                Person.root.partner.share_percent = 1 / 2;
                Person.root.partner.min_share_percent = (1 / 2) * (1 / 2);

                Person.root.distributeToParental1(1 / 2, 3 / 4, true);
            } else if (Person.root.isParental2Alive) {
                Person.root.partner.share_percent = 3 / 4;
                Person.root.partner.min_share_percent = (3 / 4) * (1 / 2);

                Person.root.distributeToParental2(1 / 4, 1 / 2)
            } else {
                Person.root.partner.share_percent = 1 / 1;
                Person.root.partner.min_share_percent = (1 / 1) * (1 / 2);
            }
        } else {
            if (Person.root.isParental1Alive) {
                Person.root.distributeToParental1(1 / 1, 1 / 2, true);
            } else if (Person.root.isParental2Alive) {
                Person.root.distributeToParental2(1 / 1, 1 / 2);
            } else if (Person.root.isParental3Alive) {
                Person.root.distributeToParental3(1 / 1);
            }
        }

        // Free quota + absolute share
        Person.free_quota_percent = 1;
        for (let person of Person.everyone) {
            person.share_absolute = person.share_percent * amount;
            person.min_share_absolute = person.min_share_percent * amount;
            Person.free_quota_percent -= person.min_share_percent;
        }
        Person.free_quota_absolute = Person.free_quota_percent * amount;
    }

    /// Import and export

    static json() {
        return {
            everyone: Person.everyone.map(p => p.json()),
            root_id: Person.root.id,
            free_quota_percent: Person.free_quota_percent,
            free_quota_absolute: Person.free_quota_absolute,
        }
    }

    static exportList() {
        return Person.everyone.map(p => p.jsonForExport());
    }

    static importList(persons) {
        Person.highestid = 0;
        Person.everyoneById = {};
        Person.root = null;
        for (let pdata of persons) {
            let p = new Person(pdata.name, pdata.alive, pdata.isroot, pdata.id);
            p.generation = pdata.generation;
        }
        for (let pdata of persons) {
            let p = Person.everyoneById[pdata.id];
            if (pdata.parent1_id !== null) p.parent1 = Person.everyoneById[pdata.parent1_id];
            if (pdata.parent2_id !== null) p.parent2 = Person.everyoneById[pdata.parent2_id];
            if (pdata.partner_id !== null) p.partner = Person.everyoneById[pdata.partner_id];
            for (let cid of pdata.children_ids) {
                p.children.push(Person.everyoneById[cid])
            }
        }
    }

    // Constructor

    constructor(name, alive, isroot = false, customid = null) {
        this.id = customid === null ? Person.highestid++ : customid;
        this.name = String(name);
        this.alive = Boolean(alive);
        this.generation = null;

        this.parent1 = null;
        this.parent2 = null;

        this.children = [];

        this.share_percent = 0;
        this.share_absolute = 0;
        this.min_share_percent = 0;
        this.min_share_absolute = 0;

        Person.everyoneById[this.id] = this;

        if (isroot) {
            Person.root = this;
            this.partner = null;
            this.generation = 0;
        };
    }

    // Properties

    /// Parentals

    get isParental1Alive() {
        for (let child of this.children) {
            if (child.isTreeAlive) return true;
        }
        return false;
    }

    get isParental2Alive() {
        return (this.parent1 && this.parent1.isTreeAlive) || (this.parent2 && this.parent2.isTreeAlive);
    }

    get isParental3Alive() {
        return (this.parent1 && this.parent1.isParental2Alive) || (this.parent2 && this.parent2.isParental2Alive)
    }

    /// Helpers

    get isTreeAlive() {
        return this.alive || this.isParental1Alive;
    }

    get childrenWithTreeAlive() {
        let list = [];
        for (let child of this.children) {
            if (child.isTreeAlive) {
                list.push(child);
            }
        }
        return list;
    }

    get canDelete() {
        return (Person.root !== this && Person.root.partner !== this && this.generation !== -2 && !(this.generation === -1 && ((Person.root.parent1 && Person.root.parent1 === this) || (Person.root.parent2 && Person.root.parent2 === this))));
    }

    get isPartner() {
        return Person.root.partner === this;
    }

    get isRoot() {
        return Person.root === this;
    }

    /// Display

    get displayName() {
        let id = this.id.toString().padStart(2, "0");
        return (this.alive ? `(${id}) ` : `[${id}] `) + this.name;
    }

    get displayShareRelative() {
        var f = frac(this.share_percent, 999);
        return `Relativ: ${round(this.share_percent * 100)}% (${f[1]}/${f[2]})`;
    }

    get displayShareAbsolute() {
        return `Absolut: ${roundMoney(this.share_absolute)} CHF`;
    }

    get displayMinShareRelative() {
        var f = frac(this.min_share_percent, 999);
        return `Min. Relativ: ${round(this.min_share_percent * 100)}% (${f[1]}/${f[2]})`;
    }

    get displayMinShareAbsolute() {
        return `Min. Absolut: ${roundMoney(this.min_share_absolute)} CHF`;
    }

    // Methods

    addChild(child, parent2 = null) {
        child.generation = this.generation + 1;
        child.setParent1(this);
        if (parent2) child.setParent2(parent2);
    }

    setPartner(partner) {
        this.partner = partner;
        this.partner.partner = this;
    }

    setParent1(parent) {
        parent.children.push(this);
        this.parent1 = parent;
        this.parent1.generation = this.generation - 1;
    }

    setParent2(parent) {
        parent.children.push(this);
        this.parent2 = parent;
        this.parent2.generation = this.generation - 1;
    }

    delete() {
        if (this.parent1) {
            let index = this.parent1.children.indexOf(this);
            this.parent1.children.splice(index, 1);
        }
        if (this.parent2) {
            let index = this.parent2.children.indexOf(this);
            this.parent2.children.splice(index, 1);
        }
        this.deleteRecursive();
        Person.resetDistribution();
    }

    deleteRecursive() {
        for (let child of this.children) {
            child.deleteRecursive();
        }
        delete Person.everyoneById[this.id];
    }

    /// Export

    json() {
        return {
            id: this.id,
            name: this.name,
            alive: this.alive,
            generation: this.generation,
            share_percent: this.share_percent,
            share_absolute: this.share_absolute,
            min_share_percent: this.min_share_percent,
            min_share_absolute: this.min_share_absolute,

            parent1_id: this.parent1 ? this.parent1.id : null,
            parent2_id: this.parent2 ? this.parent2.id : null,
            children_ids: this.children.map(c => c.id),
        }
    }

    jsonForExport() {
        return {
            id: this.id,
            name: this.name,
            alive: this.alive,
            generation: this.generation,

            parent1_id: this.parent1 ? this.parent1.id : null,
            parent2_id: this.parent2 ? this.parent2.id : null,
            partner_id: this.partner ? this.partner.id : null,
            children_ids: this.children.map(c => c.id),

            isroot: this.isRoot,
        }
    }

    /// Distribution

    distributeToParental1(percent, mandatorypart = 0, ignorealive = false) {
        if (this.alive && !ignorealive) {
            this.share_percent += percent;
            this.min_share_percent += percent * mandatorypart;
        } else {
            let people_to_share_with = this.childrenWithTreeAlive;
            let percent_per_person = percent / people_to_share_with.length;
            for (let person of people_to_share_with) {
                person.distributeToParental1(percent_per_person, mandatorypart);
            }
        }
    }

    distributeToParental2(percent, mandatorypart = 0) {
        let p1 = this.parent1 && this.parent1.isTreeAlive;
        let p2 = this.parent2 && this.parent2.isTreeAlive;

        if (p1 && p2) {
            this.parent1.distributeToParental1(percent / 2);
            this.parent2.distributeToParental1(percent / 2);

            if (this.parent1.alive) this.parent1.min_share_percent = (percent / 2) * mandatorypart;
            if (this.parent2.alive) this.parent2.min_share_percent = (percent / 2) * mandatorypart;
        } else if (p1) {
            this.parent1.distributeToParental1(percent);

            if (this.parent1.alive) this.parent1.min_share_percent = percent * mandatorypart;
        } else if (p2) {
            this.parent2.distributeToParental1(percent);

            if (this.parent2.alive) this.parent2.min_share_percent = percent * mandatorypart;
        }
    }

    distributeToParental3(percent) {
        let p1 = (this.parent1 && this.parent1.isParental2Alive);
        let p2 = (this.parent2 && this.parent2.isParental2Alive);

        if (p1 && p2) {
            this.parent1.distributeToParental2(percent / 2, 0);
            this.parent2.distributeToParental2(percent / 2, 0);
        } else if (p1) {
            this.parent1.distributeToParental2(percent, 0);
        } else if (p2) {
            this.parent2.distributeToParental2(percent, 0);
        }
    }
}

///// Interface

let app = document.getElementById("app");

let menu_action = document.getElementById("menu_action");
let menu_select = document.getElementById("menu_select");
let menu_infos = document.getElementById("menu_infos");

class Interface {
    static hideInfotexts = false;

    static selectedItem = null;
    static actionDropdown = new bootstrap.Dropdown(document.getElementById("menu_action_toggle"));

    static fullscreen() {
        app.requestFullscreen();
    }

    // Menus

    static _menu_setItems(menu, items) {
        menu.innerHTML = "";
        for (let item of items) {
            let elem = document.createElement(item.element || "a");
            elem.innerText = item.text || "";
            if (item.innerHTML) elem.innerHTML = item.innerHTML;
            elem.setAttribute("class", "dropdown-item");
            elem.setAttribute("href", "#");

            for (let attr in item) {
                if (!["innerHTML", "text", "element"].includes(attr)) elem.setAttribute(attr, item[attr]);
            }

            menu.appendChild(elem);
        }
    }

    static _menu_updateSelectMenu() {
        let items = [
            { element: "strong", class: "dropdown-header", text: "Person auswählen" },
        ];
        for (let person of Person.everyone) {
            items.push({
                text: person.displayName,
                onclick: `Interface.select(${person.id});`,
                class: (person === Interface.selectedItem) ? "dropdown-item active" : "dropdown-item"
            })
        }
        Interface._menu_setItems(menu_select, items);
    }

    static _menu_updateActionMenu() {
        let items = [];
        if (Interface.selectedItem === null) {
            items.push({ element: "strong", class: "dropdown-header", text: "Bitte wählen Sie zuerst eine Person aus!" });
        } else {
            items.push({ element: "strong", class: "dropdown-header", text: "Umbenennen" });
            items.push({ element: "div", innerHTML: `<input id="renameinput" class="form-control" placeholder="Umbenennen" oninput="Interface.rename(this.value);" value="${Interface.selectedItem.name}">` });

            if (!Interface.selectedItem.isRoot || Interface.selectedItem.canDelete) {
                items.push({ element: "div", class: "dropdown-divider" });
                items.push({ element: "strong", class: "dropdown-header", text: "Ändern" });
                if (!Interface.selectedItem.isRoot) items.push({ text: "Lebend / Tot", onclick: "Interface.toggleAlive();", class: Interface.selectedItem.alive ? "dropdown-item active" : "dropdown-item" });
                if (Interface.selectedItem.canDelete) items.push({ text: "Löschen (inkl. Nachkommen)", onclick: "Interface.delete();" });
            }
            if (!Interface.selectedItem.isPartner) { // Allow children for everyone except partner
                items.push({ element: "div", class: "dropdown-divider" });

                items.push({ element: "strong", class: "dropdown-header", text: "Kind hinzufügen" });

                let other = null;
                if (Person.root.parent2 && Interface.selectedItem == Person.root.parent1) {
                    other = Person.root.parent2;
                } else if (Person.root.parent1 && Interface.selectedItem == Person.root.parent2) {
                    other = Person.root.parent1;
                } else if (Person.root.parent1 && Person.root.parent1.parent2 && Interface.selectedItem == Person.root.parent1.parent1) {
                    other = Person.root.parent1.parent2;
                } else if (Person.root.parent1 && Person.root.parent1.parent1 && Interface.selectedItem == Person.root.parent1.parent2) {
                    other = Person.root.parent1.parent1;
                } else if (Person.root.parent2 && Person.root.parent2.parent2 && Interface.selectedItem == Person.root.parent2.parent1) {
                    other = Person.root.parent2.parent2;
                } else if (Person.root.parent2 && Person.root.parent2.parent1 && Interface.selectedItem == Person.root.parent2.parent2) {
                    other = Person.root.parent2.parent1;
                }

                if (other) {
                    items.push({ text: `Kind mit (${other.id}) ${other.name}`, onclick: `Interface.addChild(${Interface.selectedItem.id},${other.id});` });
                    items.push({ text: "Kind mit anderer Person", onclick: `Interface.addChild(${Interface.selectedItem.id});` });
                } else {
                    items.push({ text: "Neues Kind", onclick: `Interface.addChild(${Interface.selectedItem.id});` });
                }
            }
        }
        Interface._menu_setItems(menu_action, items);
    }

    static _menu_updateInfosMenu() {
        let items = [];
        if (Interface.selectedItem === null) {
            items.push({ element: "strong", class: "dropdown-header", text: "Bitte wählen Sie zuerst eine Person aus!" });
        } else {
            items.push({ element: "strong", class: "dropdown-header", text: "Generell" });
            items.push({ tabIndex: -1, class: "dropdown-item disabled", text: `ID: ${Interface.selectedItem.id}` });
            items.push({ tabIndex: -1, class: "dropdown-item disabled", text: `Name: ${Interface.selectedItem.name}` });
            items.push({ tabIndex: -1, class: "dropdown-item disabled", text: "Status: " + (Interface.selectedItem.alive ? "Lebend" : "Tot") });

            if (Interface.selectedItem.alive) {
                items.push({ element: "div", class: "dropdown-divider" });
                items.push({ element: "strong", class: "dropdown-header", text: "Erbanteil" });
                items.push({ tabIndex: -1, class: "dropdown-item disabled", text: Interface.selectedItem.displayShareRelative });
                items.push({ tabIndex: -1, class: "dropdown-item disabled", text: Interface.selectedItem.displayShareAbsolute });
                items.push({ tabIndex: -1, class: "dropdown-item disabled", text: Interface.selectedItem.displayMinShareRelative });
                items.push({ tabIndex: -1, class: "dropdown-item disabled", text: Interface.selectedItem.displayMinShareAbsolute });
            } else if (Interface.selectedItem && Interface.selectedItem.isRoot) {
                items.push({ element: "div", class: "dropdown-divider" });
                items.push({ element: "strong", class: "dropdown-header", text: "Freie Quote" });
                items.push({ tabIndex: -1, class: "dropdown-item disabled", text: Person.displayFreeQuotaRelative });
                items.push({ tabIndex: -1, class: "dropdown-item disabled", text: Person.displayFreeQuotaAbsolute });
            }

            if (Interface.selectedItem.parent1 || Interface.selectedItem.parent2) {
                items.push({ element: "div", class: "dropdown-divider" });
                items.push({ element: "strong", class: "dropdown-header", text: "Eltern" });
                if (Interface.selectedItem.parent1) items.push({ text: Interface.selectedItem.parent1.displayName, onclick: `Interface.select(${Interface.selectedItem.parent1.id});` });
                if (Interface.selectedItem.parent2) items.push({ text: Interface.selectedItem.parent2.displayName, onclick: `Interface.select(${Interface.selectedItem.parent2.id});` });
            }

            if (Interface.selectedItem.children.length > 0) {
                items.push({ element: "div", class: "dropdown-divider" });
                items.push({ element: "strong", class: "dropdown-header", text: "Kinder" });
                for (let child of Interface.selectedItem.children) {
                    items.push({ text: child.displayName, onclick: `Interface.select(${child.id});` });
                }
            }
        }
        Interface._menu_setItems(menu_infos, items);
    }

    // Actions

    static select(itemid) {
        Interface.selectedItem = Person.everyoneById[itemid];
        Interface.update();
    }

    static delete() {
        FamilyTreePerson.deleteById(Interface.selectedItem.id);
        Interface.selectedItem.delete();
        Interface.selectedItem = null;
        Interface.update();
    }

    static rename(name) {
        Interface.selectedItem.name = name;
        Interface._menu_updateSelectMenu();
        Interface._menu_updateInfosMenu();
        FamilyTreePerson.updateById(Interface.selectedItem.id);
    }

    static toggleAlive() {
        if (!(Interface.selectedItem.isRoot)) {
            Interface.selectedItem.alive = !Interface.selectedItem.alive;
            Interface.update();
        }
    }

    static addChild(p1id, p2id = null) {
        let child = new Person(p2id !== null ? `Kind von (${p1id}) und (${p2id})` : `Kind von (${p1id})`, true);
        let parent1 = Person.everyoneById[p1id];
        let parent2 = p2id === null ? null : Person.everyoneById[p2id];
        parent1.addChild(child, parent2);
        Interface.select(child.id);
    }

    // General

    static update() {
        Person.distribute(parseInt(document.getElementById("valueinput").value || 0));
        Interface._menu_updateSelectMenu();
        Interface._menu_updateActionMenu();
        Interface._menu_updateInfosMenu();
        FamilyTree.hideContextMenu();
        FamilyTreePerson.updateAll();
        Interface.exportToUrl();
    }

    static toggleInfotexts() {
        Interface.hideInfotexts = !Interface.hideInfotexts;
        Interface.update();
        document.getElementById("toggleInfotexts").className = Interface.hideInfotexts ? "dropdown-item" : "dropdown-item active";
    }

    // Events

    static onfullscreenchange(event) {
        if (document.fullscreenElement != null) {
            document.getElementById("fullscreen-open").style.display = "none";
            document.getElementById("fullscreen-close").style.display = "block";
        } else {
            document.getElementById("fullscreen-open").style.display = "block";
            document.getElementById("fullscreen-close").style.display = "none";
        }
    }

    // Import & Export

    static reset() {
        for (let id in Person.everyoneById) {
            Interface.select(id);
            Interface.delete();
        }
    }

    static importFromUrl() {
        try {
            var datastr = window.location.hash.substr(1);
            var data = JSON.parse(decodeURIComponent(datastr));

            document.getElementById("valueinput").value = data.value;
            Person.importList(data.everyone);
            FamilyTreePerson.updateAll();
            FamilyTreePerson.importPositionList(data.positions);
            Interface.select(data.selectedItemId);
            if (data.hideInfotexts) Interface.toggleInfotexts();

            return true;
        } catch (e) {
            console.log("ImportError:", e);
            return false;
        }
    }

    static exportToUrl() {
        var data = {
            value: document.getElementById("valueinput").value,
            everyone: Person.exportList(),
            positions: FamilyTreePerson.exportPositionList(),
            selectedItemId: Interface.selectedItem.id,
            hideInfotexts: Interface.hideInfotexts,
        }
        var datastr = encodeURIComponent(JSON.stringify(data));
        document.getElementById("export-url").href = location.href.split("#")[0] + "#" + datastr;
    }
}

document.getElementById("valueinput").addEventListener("input", Interface.exportToUrl);
document.getElementById("valueinput").addEventListener("input", Interface.update);
document.onfullscreenchange = Interface.onfullscreenchange;

///// FamilyTree

class FamilyTreePerson {
    static layer = new Konva.Layer();
    static everyoneById = {};

    static get everyone() {
        return Object.values(FamilyTreePerson.everyoneById);
    }

    static updateAll() {
        /// Reset all styles
        for (let person of FamilyTreePerson.everyone) {
            person.line_parent1.stroke("grey");
            person.line_parent1.strokeWidth(2);
            person.line_parent2.stroke("grey");
            person.line_parent2.strokeWidth(2);
            person.line_partner.stroke("grey");
            person.line_partner.strokeWidth(2);
            person.rect.stroke("white");
            person.rect.strokeWidth(2);
        }
        /// Create new people and update old ones
        for (let id in Person.everyoneById) {
            if (FamilyTreePerson.everyoneById.hasOwnProperty(id)) {
                FamilyTreePerson.everyoneById[id].update();
            } else {
                new FamilyTreePerson(Person.everyoneById[id]);
            }
        }
        FamilyTreePerson.layer.draw();
    }

    static deleteById(id) {
        FamilyTreePerson.everyoneById[id].delete();
    }

    static updateById(id) {
        FamilyTreePerson.everyoneById[id].update();
    }

    /// Export & Import

    static exportPositionList() {
        var list = [];
        for (let person of FamilyTreePerson.everyone) {
            list.push({
                id: person.person.id,
                x: FamilyTree.getCoordX(person.group.absolutePosition().x),
            })
        }
        return list;
    }

    static importPositionList(list) {
        for (let pdata of list) {
            if (FamilyTreePerson.everyoneById.hasOwnProperty(pdata.id)) {
                FamilyTreePerson.everyoneById[pdata.id].group.move({ x: pdata.x, y: 0 });
            } else {
                console.log("wtf", pdata)
            }
        }
    }

    /// Constructor

    constructor(person) {
        this.person = person;
        this.group = new Konva.Group({
            x: 0,
            y: (person.generation + 2) * 220,
            draggable: true,
            dragBoundFunc: pos => {
                return { x: pos.x, y: this.group.absolutePosition().y }
            }
        })
        this.group.on('click tap', () => { Interface.select(this.person.id); });
        this.group.on('dblclick dbltap', () => { Interface.select(this.person.id); Interface.toggleAlive(); });
        this.group.on('contextmenu', e => { e.evt.preventDefault(); Interface.select(this.person.id); FamilyTree.showContextMenu(); });
        this.group.on('dragmove', () => { this.updateLines(); });

        this.line_parent1 = new Konva.Line({ visible: false, listening: false, stroke: "grey" });
        FamilyTreePerson.layer.add(this.line_parent1);
        this.line_parent2 = new Konva.Line({ visible: false, listening: false, stroke: "grey" });
        FamilyTreePerson.layer.add(this.line_parent2);

        if (person.isPartner) {
            this.line_partner = this.partner.line_partner;
        } else {
            this.line_partner = new Konva.Line({ visible: false, listening: false, stroke: "grey" });
            FamilyTreePerson.layer.add(this.line_partner);
        }

        this.rect = new Konva.Rect({
            x: 0, y: 0, width: 400, height: 180,
            fill: "orange", stroke: "white", strokeWidth: 2,
            cornerRadius: 10,
        })
        this.group.add(this.rect);

        this.text_title = new Konva.Text({
            x: 10, y: 10, text: `Loading...`, fontSize: 25, fill: "white",
        })
        this.group.add(this.text_title);

        this.text_info = new Konva.Text({
            x: 15, y: 40, text: `Loading...`, fontSize: 25, fill: "black",
        })
        this.group.add(this.text_info);

        FamilyTreePerson.everyoneById[this.person.id] = this;
        FamilyTreePerson.layer.add(this.group);

        if (this.parent1) {
            this.group.attrs.x = this.parent1.group.attrs.x;
        }

        this.update();
    }

    // Properties
    /// Relations

    get parent1() {
        if (this.person.parent1 && FamilyTreePerson.everyoneById.hasOwnProperty(this.person.parent1.id)) {
            return FamilyTreePerson.everyoneById[this.person.parent1.id];
        } else {
            return null;
        }
    }

    get parent2() {
        if (this.person.parent2 && FamilyTreePerson.everyoneById.hasOwnProperty(this.person.parent2.id)) {
            return FamilyTreePerson.everyoneById[this.person.parent2.id];
        } else {
            return null;
        }
    }

    get partner() {
        if (this.person.partner && FamilyTreePerson.everyoneById.hasOwnProperty(this.person.partner.id)) {
            return FamilyTreePerson.everyoneById[this.person.partner.id];
        } else {
            return null;
        }
    }

    get children() {
        let list = [];
        for (let child of this.person.children) {
            if (FamilyTreePerson.everyoneById.hasOwnProperty(child.id)) {
                list.push(FamilyTreePerson.everyoneById[child.id]);
            }
        }
        return list;
    }

    /// Texts

    get information() {
        if (Interface.hideInfotexts) return "";

        if (this.person.isRoot) {
            return `Freie Quote:\n  Relativ: ${round(Person.free_quota_percent * 100)}%\n  Absolut: ${roundMoney(Person.free_quota_absolute)} CHF`;
        } else if (this.person.alive) {
            if (this.person.share_percent) {
                if (this.person.min_share_percent) {
                    return `Erbanteil:\n  ${this.person.displayShareRelative}\n  ${this.person.displayShareAbsolute}\n  ${this.person.displayMinShareRelative}\n  ${this.person.displayMinShareAbsolute}`;
                } else {
                    return `Erbanteil:\n  ${this.person.displayShareRelative}\n  ${this.person.displayShareAbsolute}`;
                }
            } else {
                return `Nicht erbberechtigt`;
            }
        } else {
            return `Tot`;
        }
    }

    // Methods

    updateLines() {
        /// Parent1 line
        if (this.parent1) {
            let parent1 = this.parent1;
            let ap_g = this.rect.absolutePosition();
            let ap_p = parent1.rect.absolutePosition();
            FamilyTree.zigzagLine(this.line_parent1,
                ap_g.x + (this.rect.width() * FamilyTree.stage.scaleX() / 2), ap_g.y,
                ap_p.x + (parent1.rect.width() * FamilyTree.stage.scaleX() / 2), ap_p.y + parent1.rect.height() * FamilyTree.stage.scaleY(),
            )
        } else {
            this.line_parent1.visible(false);
        }
        /// Parent2 line
        if (this.parent2) {
            let parent2 = this.parent2;
            let ap_g = this.rect.absolutePosition();
            let ap_p = parent2.rect.absolutePosition();
            FamilyTree.zigzagLine(this.line_parent2,
                ap_g.x + (this.rect.width() * FamilyTree.stage.scaleX() / 2), ap_g.y,
                ap_p.x + (parent2.rect.width() * FamilyTree.stage.scaleX() / 2), ap_p.y + parent2.rect.height() * FamilyTree.stage.scaleY(),
            )
        } else {
            this.line_parent2.visible(false);
        }
        /// Partner line
        if (this.partner) {
            let partner = this.partner;
            let ap_g = this.rect.absolutePosition();
            let ap_p = partner.rect.absolutePosition();
            let deltaX = (ap_g.x - ap_p.x) / FamilyTree.stage.scaleX();
            if (Math.abs(deltaX) > 400) {
                let y1 = ap_g.y + (this.rect.height() * FamilyTree.stage.scaleY() / 2);
                let y2 = ap_p.y + (partner.rect.height() * FamilyTree.stage.scaleY() / 2);
                let w = this.rect.width() * FamilyTree.stage.scaleX();
                FamilyTree.straightLine(this.line_partner,
                    deltaX < 0 ? ap_g.x + w : ap_g.x, y1,
                    deltaX < 0 ? ap_p.x : ap_p.x + w, y2,
                )
                this.line_partner.visible(true);
            } else {
                this.line_partner.visible(false);
            }
        } else {
            this.line_partner.visible(false);
        }
    }

    update() {
        this.text_title.text(`${this.person.id} ${this.person.name}`);
        this.text_info.text(this.information);
        this.rect.fill(this.person.isRoot ? "#2E86AB" : (this.person.alive ? (this.person.isPartner ? "#AF3B6E" : "#6B7FD7") : "#4C2A85"));
        this.updateLines();

        /// Add events
        if (this.parent1) this.parent1.group.on('dragmove', () => { this.updateLines(); });
        if (this.parent2) this.parent2.group.on('dragmove', () => { this.updateLines(); });
        if (this.partner) this.partner.group.on('dragmove', () => { this.updateLines(); });

        /// Style for selectedItem
        if (this.person === Interface.selectedItem) {
            this.rect.stroke("#fc7805")
            this.rect.strokeWidth(5);

            /// Style partner
            if (this.partner) {
                this.partner.rect.stroke("#fc05cf");
                this.partner.rect.strokeWidth(5);

                /// Style partner line
                this.line_partner.stroke("#fc05cf");
                this.line_partner.strokeWidth(4);
            }

            /// Style parent1
            if (this.parent1) {
                this.parent1.rect.stroke("#32fc05");
                this.parent1.rect.strokeWidth(5);

                /// Style parent1 line
                this.line_parent1.stroke("#32fc05");
                this.line_parent1.strokeWidth(4);
            }

            /// Style parent2
            if (this.parent2) {
                this.parent2.rect.stroke("#32fc05");
                this.parent2.rect.strokeWidth(5);

                /// Style parent2 line
                this.line_parent2.stroke("#32fc05");
                this.line_parent2.strokeWidth(4);
            };

            /// Style children
            for (let child of this.children) {
                child.rect.stroke("#0536fc");
                child.rect.strokeWidth(5);

                /// Style children lines
                if (child.person.parent1 == this.person) {
                    child.line_parent1.stroke("#0536fc");
                    child.line_parent1.strokeWidth(4);
                } else if (child.person.parent2 == this.person) {
                    child.line_parent2.stroke("#0536fc");
                    child.line_parent2.strokeWidth(4);
                }
            }
        }
    }

    delete() {
        this.text_title.destroy();
        this.text_info.destroy();
        this.rect.destroy();
        this.line_parent1.destroy();
        this.line_parent2.destroy();
        if (this.line_partner) this.line_partner.destroy();
        this.group.destroy();
        delete FamilyTreePerson.everyoneById[this.person.id];
        for (let child of this.person.children) {
            FamilyTreePerson.deleteById(child.id);
        }
    }
}

let menu_context = document.getElementById('menu_context');

class FamilyTree {
    static STAGEWIDTH = 2000;
    static STAGEHEIGHT = 2000;
    static ZOOMSPEED = 1.01;
    static stage = new Konva.Stage({
        container: 'canvascontainer',
        width: this.STAGEWIDTH,
        height: this.STAGEHEIGHT,
        draggable: true,
    })

    // Methods
    /// Zoom

    static zoom(direction, speed) {
        var oldScale = FamilyTree.stage.scaleX();

        var pointer = FamilyTree.stage.getPointerPosition();

        var mousePointTo = {
            x: (pointer.x - FamilyTree.stage.x()) / oldScale,
            y: (pointer.y - FamilyTree.stage.y()) / oldScale,
        };

        var newScale = direction ? oldScale * (speed || FamilyTree.ZOOMSPEED) : oldScale / (speed || FamilyTree.ZOOMSPEED);

        FamilyTree.stage.scale({ x: newScale, y: newScale });

        var newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };
        FamilyTree.stage.position(newPos);
        FamilyTree.stage.batchDraw();
    }

    static zoomAbsolute(scale) {
        FamilyTree.zoom(true, scale / FamilyTree.stage.scaleX());
    }

    /// Context menu

    static showContextMenu() {
        /// Show menu
        menu_context.innerHTML = menu_action.innerHTML;
        menu_context.style.display = 'initial';
        var containerRect = FamilyTree.stage.container().getBoundingClientRect();
        menu_context.style.top = containerRect.top + FamilyTree.stage.getPointerPosition().y + 4 + 'px';
        menu_context.style.left = containerRect.left + FamilyTree.stage.getPointerPosition().x + 4 + 'px';
    }

    static hideContextMenu() {
        menu_context.style.display = 'none';
    }

    /// Tools

    static getCoordX(x) {
        return (x - FamilyTree.stage.x()) / FamilyTree.stage.scaleX();
    }

    static getCoordY(y) {
        return (y - FamilyTree.stage.y()) / FamilyTree.stage.scaleY();
    }

    static zigzagLine(line, xa, ya, xb, yb) {
        let x1 = FamilyTree.getCoordX(xa);
        let x3 = FamilyTree.getCoordX(xb);
        let y1 = FamilyTree.getCoordY(ya);
        let y2 = FamilyTree.getCoordY(ya - Math.abs(yb - ya) / 2);
        let y3 = FamilyTree.getCoordY(yb);
        let points = [x1, y1, x1, y2, x3, y2, x3, y3];
        line.points(points);
        line.visible(true);
    }

    static straightLine(line, x1, y1, x2, y2) {
        let points = [
            FamilyTree.getCoordX(x1), FamilyTree.getCoordY(y1),
            FamilyTree.getCoordX(x2), FamilyTree.getCoordY(y2),
        ];
        line.points(points);
        line.visible(true);
    }

    /// Events

    static fitStageIntoParentContainer() {
        var container = document.querySelector('#canvascontainer');
        var containerWidth = container.offsetWidth;
        var containerHeight = container.offsetHeight;

        if (containerWidth > containerHeight) {
            var scale = containerWidth / FamilyTree.STAGEWIDTH;
        } else {
            var scale = containerHeight / FamilyTree.STAGEHEIGHT;
        }

        FamilyTree.stage.width(FamilyTree.STAGEWIDTH * scale);
        FamilyTree.stage.height(FamilyTree.STAGEHEIGHT * scale);
        FamilyTree.stage.scale({ x: scale, y: scale });
        FamilyTree.stage.draw();
    }

    static onWheel(e) {
        e.evt.preventDefault();
        FamilyTree.zoom(e.evt.deltaY < 0);
    }

    /// Export

    static downloadURI(uri, name) {
        // function from https://stackoverflow.com/a/15832662/512042
        var link = document.createElement('a');
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    static exportPNG() {
        var date = (new Date(Date.now())).toLocaleDateString();
        FamilyTree.downloadURI(FamilyTree.stage.toDataURL(), `Erbrechner Export vom ${date}.png`)
    }
}

FamilyTree.stage.on('click tap dragend', Interface.exportToUrl);
FamilyTree.stage.on('click tap dragstart', FamilyTree.hideContextMenu);
FamilyTree.stage.on('wheel', FamilyTree.onWheel);
FamilyTree.stage.add(FamilyTreePerson.layer);

window.addEventListener('load', FamilyTree.fitStageIntoParentContainer);
window.addEventListener('resize', FamilyTree.fitStageIntoParentContainer);

///// OnLoad

window.addEventListener('load', () => {
    var succes = Interface.importFromUrl();
    console.log(Person.everyoneById);

    if (!succes) {
        console.log("Create default family...");

        p = new Person("Hauptperson", false, true);
        p.setPartner(new Person("Ehepartner", false));

        p.setParent1(new Person("Vater", true));
        p.parent1.setParent1(new Person("Grossvater (paternal)", false));
        p.parent1.setParent2(new Person("Grossmutter (paternal)", false));

        p.setParent2(new Person("Mutter", true));
        p.parent2.setParent1(new Person("Grossvater (maternal)", false));
        p.parent2.setParent2(new Person("Grossmutter (maternal)", false));

        Interface.select(p.id);

        FamilyTreePerson.importPositionList([
            {id: 0, x: 650},
            {id: 1, x: 1090},
            {id: 2, x: 210},
            {id: 3, x: 0},
            {id: 4, x: 420},
            {id: 5, x: 1090},
            {id: 6, x: 880},
            {id: 7, x: 1300},
        ]);
    }

    FamilyTreePerson.updateAll();
    FamilyTree.stage.batchDraw();
    Interface.exportToUrl();
});