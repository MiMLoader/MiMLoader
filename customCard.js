function customCard({ element, image, name, type, effect, energy, rarity, exhaust, retain }) {
    console.log(element, image, name, type, effect, energy, rarity, exhaust, retain)
}
function effect() {}




const customBash = new customCard({
    element: 'neutral',
    image: '/assets/cards/bash.png',
    name: 'Bash',
    type: 'skill',
    effect: new effect(target.armor.reduce(1)),
    energy: 1,
    rarity: 1,
    exhaust: false,
    retain: false
})