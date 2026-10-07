// Évite une fenêtre console supplémentaire sous Windows en version publiée. NE PAS SUPPRIMER.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    cosmos_lib::run();
}
